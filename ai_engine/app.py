from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables
if os.path.exists('../Backend/.env'):
    load_dotenv('../Backend/.env')
else:
    load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    print(f"[AI ENGINE] Gemini API Key detected (starts with: {api_key[:4]}...)")
else:
    print("[AI ENGINE] WARNING: GEMINI_API_KEY NOT FOUND. System will use local fallback model.")

from rule_engine import run_rules
from llm.llm_chain import generate_treatment_plan, predict_outcomes, query_treatment_plan, format_evidence_llm, format_pathway_llm
from utils.vcf_parser import parse_vcf
from utils.formatter import format_multimodal_data # Import the new formatter
from utils.outcome_engine import engine as outcome_engine # Import the new Outcome Engine
from utils.report_generator import generate_cancer_report # Import the report generator
from utils.clinical_memory import save_experience, retrieve_similar_experience, get_memory_stats # Update imports
import re
import random
import pdfplumber
import os
import spacy
from datetime import datetime

# Load scispaCy model for medical entity extraction
try:
    nlp = spacy.load("en_core_sci_sm")
    print("[AI ENGINE] scispaCy model loaded successfully.")
except Exception as e:
    print(f"[AI ENGINE] Error loading scispaCy: {e}. Falling back to standard spaCy.")
    nlp = None

app = Flask(__name__)
CORS(app)

@app.route('/generate_report', methods=['POST'])
def generate_report_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        patient_name = data.get('name', 'Patient').replace(' ', '_')
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{patient_name}_{timestamp}_Summary.pdf"
        
        # Ensure reports directory exists
        # Use environment variable or absolute path based on workspace root
        reports_dir = os.getenv('REPORTS_DIR', os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'reports')))
        os.makedirs(reports_dir, exist_ok=True)
        
        output_path = os.path.join(reports_dir, filename)
        
        # Call the utility function
        generate_cancer_report(output_path, data)
        
        return jsonify({
            "success": True,
            "message": "Report generated successfully",
            "filename": filename,
            "path": output_path
        })
    except Exception as e:
        print(f"Error in generate_report_route: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/learn_from_case', methods=['POST'])
def learn_from_case_route():
    """
    Endpoint to trigger 'learning' by indexing a finalized case into FAISS memory.
    """
    try:
        data = request.get_json()
        patient_data = data.get('patient_data')
        treatment_plan = data.get('treatment_plan')
        feedback_score = data.get('feedback_score', 1.0)
        is_correction = data.get('is_correction', False)

        if not patient_data or not treatment_plan:
            return jsonify({"error": "Missing patient_data or treatment_plan"}), 400

        success = save_experience(patient_data, treatment_plan, feedback_score, is_correction)
        
        return jsonify({
            "success": success,
            "message": f"Case {'correction' if is_correction else 'experience'} successfully added to memory."
        })
    except Exception as e:
        print(f"Error in learn_from_case_route: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/memory_stats', methods=['GET'])
def memory_stats_route():
    """
    Returns aggregated learning statistics from the local memory store.
    """
    try:
        stats = get_memory_stats()
        return jsonify(stats)
    except Exception as e:
        print(f"Error in memory_stats_route: {e}")
        return jsonify({"error": str(e)}), 500

def extract_text_from_pdf(file_path):
    """Extracts text from a PDF file using pdfplumber."""
    text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None
    return text

def clean_value(text):
    """Removes extra colons, double spaces, and common mangling artifacts."""
    if not text:
        return ""
    # Remove colons
    text = re.sub(':', '', text)
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_report_text(text):
    """
    Parses unstructured report text. 
    Uses a hybrid of Regex and scispaCy for high-accuracy local extraction.
    """
    patient_data = {}
    
    # 1. Clean and Normalize Text
    clean_text = re.sub(':', '', text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()

    # 2. NLP Analysis with scispaCy
    doc = nlp(text) if nlp else None
    
    # Extract entities for context
    entities = [ent.text.lower() for ent in doc.ents] if doc else []

    # 3. Cancer Type Detection
    if any(kw in clean_text.lower() for kw in ["breast", "mammary", "ductal"]):
        patient_data['cancer_type'] = "Breast"
    elif any(kw in clean_text.lower() for kw in ["brain", "neuropathology", "glioma", "glioblastoma", "astrocytoma"]):
        patient_data['cancer_type'] = "Brain"
    elif any(kw in clean_text.lower() for kw in ["lung", "pulmonary", "nsclc", "sclc"]):
        patient_data['cancer_type'] = "Lung"
    elif any(kw in clean_text.lower() for kw in ["liver", "hepatocellular", "hcc", "hepatic"]):
        patient_data['cancer_type'] = "Liver"
    elif any(kw in clean_text.lower() for kw in ["pancreas", "pancreatic", "panc"]):
        patient_data['cancer_type'] = "Pancreas"
    
    # 4. Demographics (Regex remains most reliable for numbers)
    age_m = re.search(r"Age\s*(\d+)", clean_text, re.IGNORECASE)
    if age_m: patient_data['age'] = int(age_m.group(1))

    # Name Extraction (More robust for different layouts)
    name_m = re.search(r"(?:Patient\s*)?Name\s*[:\n]\s*([^0-9\n:]+)", text, re.IGNORECASE)
    if name_m: 
        patient_data['name'] = name_m.group(1).strip()

    # MRN Extraction (Table-Aware)
    mrn_m = re.search(r"MRN\s*[:\n]\s*([A-Z0-9-]+)", text, re.IGNORECASE)
    if mrn_m: patient_data['mrn'] = mrn_m.group(1).strip()

    # DOB Extraction (Table-Aware)
    dob_m = re.search(r"DOB\s*[:\n]\s*(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)
    if dob_m: patient_data['dob'] = dob_m.group(1).strip()

    # Date of Diagnosis Extraction
    diag_date_m = re.search(r"Date of Diagnosis\s*[:\n]\s*(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})", text, re.IGNORECASE)
    if diag_date_m: patient_data['diagnosis_date'] = diag_date_m.group(1).strip()

    # KPS Score Extraction
    kps_m = re.search(r"KPS Score\s*[:\n]\s*(\d+)", text, re.IGNORECASE)
    if kps_m: patient_data['kps'] = int(kps_m.group(1))

    # ECOG Score Extraction
    ecog_m = re.search(r"ECOG Score\s*[:\n]\s*(\d)", text, re.IGNORECASE)
    if ecog_m: patient_data['ecog'] = int(ecog_m.group(1))

    # 5. Biomarkers (Brain)
    # MGMT
    mgmt_m = re.search(r"MGMT\s*(?:Promoter)?\s*(?:Status)?\s*[:\n\s]*(Methylated|Unmethylated|Positive|Negative)", text, re.IGNORECASE)
    if mgmt_m:
        patient_data['MGMT'] = mgmt_m.group(1).capitalize()
    
    # IDH
    idh_m = re.search(r"IDH\s*(?:Status)?\s*[:\n\s]*(Mutant|Wild-Type|Wildtype|Mutated|WT|Positive|Negative|1|2)", text, re.IGNORECASE)
    if idh_m:
        val = idh_m.group(1).upper()
        if val in ["MUTANT", "MUTATED", "POSITIVE", "1", "2"]: 
            patient_data['IDH1'] = "Mutated"
        else: 
            patient_data['IDH1'] = "Wild Type"

    # Resection Extent (New)
    resection_m = re.search(r"Resection\s*(?:Extent|Status)?\s*[:\n\s]*(Gross\s*Total|Subtotal|Partial|Biopsy)", text, re.IGNORECASE)
    if resection_m:
        patient_data['resection'] = resection_m.group(1).strip().title()

    # 6. Biomarkers (Breast)
    for marker in ['ER', 'PR', 'HER2']:
        m = re.search(rf"{marker}\s*(Status)?\s*(Positive|Negative|3\+|2\+|1\+|0)", clean_text, re.IGNORECASE)
        if m:
            val = m.group(2).capitalize()
            patient_data[marker] = "Positive" if val in ["Positive", "3+"] else "Negative"

    brca_m = re.search(r"BRCA[12]?\s*(Positive|Mutated|Mutant|Present|Detected)", clean_text, re.IGNORECASE)
    if brca_m: patient_data['BRCA'] = "positive"
    
    ki_m = re.search(r"Ki-67.*?(\d+)%", clean_text, re.IGNORECASE)
    if ki_m: patient_data['ki67'] = ki_m.group(1)

    # 7. Diagnosis & Grade Enhancement with NLP
    if doc:
        # Use scispaCy to find specific disease entities if Regex misses it
        for ent in doc.ents:
            if ent.label_ in ["DISEASE", "CANCER"] and not patient_data.get('diagnosis'):
                patient_data['diagnosis'] = ent.text
                break

    if not patient_data.get('diagnosis'):
        diag_m = re.search(r"Diagnosis\s*(.*?)(?:IDH|MGMT|WHO|Grade|Tumor|Stage|ER Status|$)", clean_text, re.IGNORECASE)
        if diag_m:
            patient_data['diagnosis'] = diag_m.group(1).strip()
    
    # Grade (Universal)
    grade_m = re.search(r"(?:WHO\s*)?Grade\s*([IV1234]+)", clean_text, re.IGNORECASE)
    if grade_m:
        g = grade_m.group(1).upper()
        mapping = {"1": "I", "2": "II", "3": "III", "4": "IV"}
        patient_data['grade'] = mapping.get(g, g)
        if patient_data.get('cancer_type') == 'Brain':
            patient_data['stage'] = 'LOCALIZED' 

    # 8. Staging
    if patient_data.get('cancer_type') != 'Brain':
        stage_m = re.search(r"Stage\s*([IV01234]+)", clean_text, re.IGNORECASE)
        if stage_m:
            s = stage_m.group(1).upper()
            mapping = {"1": "I", "2": "II", "3": "III", "4": "IV"}
            canonical_stage = mapping.get(s, s)
            
            # Map canonical Roman numerals to cancer-specific semantics
            if patient_data.get('cancer_type') == 'Liver':
                liver_map = {"I": "EARLY", "II": "EARLY", "III": "INTERMEDIATE", "IV": "ADVANCED"}
                patient_data['stage'] = liver_map.get(canonical_stage, "EARLY")
            elif patient_data.get('cancer_type') == 'Pancreas':
                panc_map = {"I": "RESECTABLE", "II": "RESECTABLE", "III": "LOCALLY_ADVANCED", "IV": "METASTATIC"}
                patient_data['stage'] = panc_map.get(canonical_stage, "RESECTABLE")
            else:
                patient_data['stage'] = canonical_stage
        elif patient_data.get('grade'):
            g = patient_data['grade']
            if patient_data.get('cancer_type') == 'Liver':
                liver_map = {"I": "EARLY", "II": "EARLY", "III": "INTERMEDIATE", "IV": "ADVANCED"}
                patient_data['stage'] = liver_map.get(g, "EARLY")
            elif patient_data.get('cancer_type') == 'Pancreas':
                panc_map = {"I": "RESECTABLE", "II": "RESECTABLE", "III": "LOCALLY_ADVANCED", "IV": "METASTATIC"}
                patient_data['stage'] = panc_map.get(g, "RESECTABLE")
            else:
                patient_data['stage'] = g

    return patient_data

def predict_side_effects(patient_data):
    """
    Predicts side effects based on patient data.
    This is a simplified rule-based approach.
    """
    side_effects = {
        "fatigue": random.uniform(30, 40),
        "nausea": random.uniform(20, 30),
        "cognitiveImpairment": random.uniform(15, 25),
        "hematologicToxicity": random.uniform(10, 20)
    }

    if patient_data.get('cancerType') == 'Brain':
        side_effects['cognitiveImpairment'] *= 1.5
    if patient_data.get('kps', 100) < 80:
        side_effects['fatigue'] *= 1.2
    if patient_data.get('comorbidities'):
        side_effects['nausea'] *= 1.1

    return {key: round(value, 1) for key, value in side_effects.items()}

@app.route('/process_report_file', methods=['POST'])
def process_report_file():
    data = request.get_json()
    if not data or 'file_path' not in data:
        return jsonify({"error": "No file path provided"}), 400

    file_path = data['file_path']
    report_text = extract_text_from_pdf(file_path)

    if not report_text:
        return jsonify({"error": "Failed to extract text from PDF"}), 500

    # Pre-clean if necessary
    if report_text.count(':') > len(report_text) * 0.3:
        report_text = re.sub(':', '', report_text)

    patient_data = parse_report_text(report_text)

    # MERGE STRATEGY: Prioritize Form Data (Request Body) over Report Extraction
    if data.get('cancer_type'): patient_data['cancer_type'] = data.get('cancer_type')
    if data.get('age'): patient_data['age'] = data.get('age')
    if data.get('kps'): patient_data['kps'] = data.get('kps')
    if data.get('ecog'): patient_data['ecog'] = data.get('ecog')
    if data.get('comorbidities'): patient_data['comorbidities'] = data.get('comorbidities')
    if data.get('symptoms'): patient_data['symptoms'] = data.get('symptoms')

    if not patient_data.get('cancer_type'):
        return jsonify({"error": "Could not determine cancer type from the report and none provided."}), 400

    # Run rule engine
    cancer_type = patient_data.get('cancer_type')
    rules = run_rules(patient_data, cancer_type)
    if "error" in rules:
        return jsonify({"error": rules["error"]}), 400

    # Step 1: Format a rich summary from the detailed data
    multimodal_summary = format_multimodal_data(patient_data)

    # Prepare queries for RAG
    cancer_type = patient_data.get("cancer_type", "cancer")
    stage = patient_data.get("stage", "")
    query = f"{cancer_type} stage {stage} treatment"
    
    # Enrich query with critical markers
    queries = [query]
    if patient_data.get('ER'): queries.append(f"{cancer_type} ER {patient_data['ER']}")
    if patient_data.get('HER2'): queries.append(f"{cancer_type} HER2 {patient_data['HER2']}")
    if patient_data.get('MGMT'): queries.append(f"{cancer_type} MGMT {patient_data['MGMT']}")
    if patient_data.get('IDH1'): queries.append(f"{cancer_type} IDH1 {patient_data['IDH1']}")

    # Call LLM with full context
    plan_data, evidence, experiences = generate_treatment_plan(
        patient=multimodal_summary, 
        rules=rules,
        evidence_levels=rules.get("evidence_levels", []), # New param
        cancer=cancer_type,
        query=query,
        queries=queries
    )

    # Calculate Dynamic Confidence Score
    avg_rag_score = sum([e.get('score', 0.5) for e in evidence]) / len(evidence) if evidence else 0.5
    dynamic_confidence = min(99.9, max(75.0, 95.0 - (avg_rag_score * 10)))

    # Construct Structured Protocols List
    # ROBUST EXTRACTION
    primary_name = "Standard Protocol"
    if isinstance(plan_data, dict):
        p_tx = plan_data.get("primary_treatment")
        if isinstance(p_tx, dict):
            primary_name = p_tx.get("name") or p_tx.get("treatment") or p_tx.get("primary_treatment") or "Standard Protocol"
        elif isinstance(p_tx, str) and len(p_tx) > 3:
            primary_name = p_tx
    
    if len(str(primary_name)) < 5: primary_name = f"Standard {cancer_type} Protocol"

    protocols = [{
        "name": primary_name,
        "score": round(dynamic_confidence, 1),
        "duration": "12-18 months" if cancer_type == "Brain" else "6-12 months",
        "efficacy": "High",
        "toxicity": "Moderate",
        "cost": "High",
        "recommended": True
    }]

    # Add alternatives from Rule Engine
    for i, alt in enumerate(rules.get("alternative_options", [])):
        protocols.append({
            "name": alt,
            "score": round(dynamic_confidence - (i+1)*random.uniform(5, 10), 1),
            "duration": "6-12 months",
            "efficacy": "Moderate",
            "toxicity": "Low-Moderate",
            "cost": "Moderate",
            "recommended": False
        })

    # Ensure at least 3 protocols for UI consistency
    if len(protocols) < 2:
        protocols.append({
            "name": f"Targeted {cancer_type} Clinical Trial",
            "score": round(dynamic_confidence - 12.5, 1),
            "duration": "Variable",
            "efficacy": "Investigational",
            "toxicity": "Variable",
            "cost": "Trial-covered",
            "recommended": False
        })
    
    if len(protocols) < 3:
        protocols.append({
            "name": f"Advanced {cancer_type} Research Protocol",
            "score": round(protocols[-1]["score"] - 5.5, 1),
            "duration": "12-24 months",
            "efficacy": "High (Projected)",
            "toxicity": "Moderate",
            "cost": "Institutional",
            "recommended": False
        })

    return jsonify({
        'plan': plan_data,
        'evidence': evidence,
        'experiences': experiences,
        'extracted_data': patient_data,
        'confidence': round(dynamic_confidence, 1),
        'protocols': protocols
    })

@app.route('/process_report_text', methods=['POST'])
def process_report_text():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({"error": "No text provided"}), 400

    report_text = data['text']
    
    # Pre-clean
    if report_text.count(':') > len(report_text) * 0.3:
        report_text = re.sub(':', '', report_text)

    patient_data = parse_report_text(report_text)

    # MERGE STRATEGY: Prioritize Form Data (Request Body) over Report Extraction
    if data.get('cancer_type'): patient_data['cancer_type'] = data.get('cancer_type')
    if data.get('age'): patient_data['age'] = data.get('age')
    if data.get('kps'): patient_data['kps'] = data.get('kps')
    if data.get('ecog'): patient_data['ecog'] = data.get('ecog')
    if data.get('comorbidities'): patient_data['comorbidities'] = data.get('comorbidities')
    if data.get('symptoms'): patient_data['symptoms'] = data.get('symptoms')

    if not patient_data.get('cancer_type'):
        return jsonify({"error": "Could not determine cancer type from the report and none provided."}), 400

    # Run rule engine
    cancer_type = patient_data.get('cancer_type')
    rules = run_rules(patient_data, cancer_type)
    if "error" in rules:
        return jsonify({"error": rules["error"]}), 400

    # Step 1: Format a rich summary from the detailed data
    multimodal_summary = format_multimodal_data(patient_data)

    # Prepare queries
    cancer_type = patient_data.get("cancer_type", "cancer")
    stage = patient_data.get("stage", "")
    query = f"{cancer_type} stage {stage} treatment"
    
    queries = [query]
    if patient_data.get('ER'): queries.append(f"{cancer_type} ER {patient_data['ER']}")
    if patient_data.get('HER2'): queries.append(f"{cancer_type} HER2 {patient_data['HER2']}")
    if patient_data.get('MGMT'): queries.append(f"{cancer_type} MGMT {patient_data['MGMT']}")

    # Call LLM with full context
    plan_data, evidence, experiences = generate_treatment_plan(
        patient=multimodal_summary,
        rules=rules,
        evidence_levels=rules.get("evidence_levels", []), # New param
        cancer=cancer_type,
        query=query,
        queries=queries
    )

    # Calculate Dynamic Confidence Score
    avg_rag_score = sum([e.get('score', 0.5) for e in evidence]) / len(evidence) if evidence else 0.5
    dynamic_confidence = min(99.9, max(75.0, 95.0 - (avg_rag_score * 10)))

    # Construct Structured Protocols List
    # ROBUST EXTRACTION
    primary_name = "Standard Protocol"
    if isinstance(plan_data, dict):
        p_tx = plan_data.get("primary_treatment")
        if isinstance(p_tx, dict):
            primary_name = p_tx.get("name") or p_tx.get("treatment") or p_tx.get("primary_treatment") or "Standard Protocol"
        elif isinstance(p_tx, str) and len(p_tx) > 3:
            primary_name = p_tx
    
    if len(str(primary_name)) < 5: primary_name = f"Standard {cancer_type} Protocol"

    protocols = [{
        "name": primary_name,
        "score": round(dynamic_confidence, 1),
        "duration": "12-18 months" if cancer_type == "Brain" else "6-12 months",
        "efficacy": "High",
        "toxicity": "Moderate",
        "cost": "High",
        "recommended": True
    }]

    for i, alt in enumerate(rules.get("alternative_options", [])):
        protocols.append({
            "name": alt['treatment'] if isinstance(alt, dict) else alt,
            "score": round(dynamic_confidence - (i+1)*random.uniform(5, 10), 1),
            "duration": "6-12 months",
            "efficacy": "Moderate",
            "toxicity": "Low-Moderate",
            "cost": "Moderate",
            "recommended": False
        })

    if len(protocols) < 2:
        protocols.append({ "name": f"Targeted {cancer_type} Clinical Trial", "score": round(dynamic_confidence - 12.5, 1), "duration": "Variable", "efficacy": "Investigational", "toxicity": "Variable", "cost": "Trial-covered", "recommended": False })
    
    if len(protocols) < 3:
        protocols.append({ "name": f"Advanced {cancer_type} Research Protocol", "score": round(dynamic_confidence - 18.0, 1), "duration": "12-24 months", "efficacy": "High (Projected)", "toxicity": "Moderate", "cost": "Institutional", "recommended": False })

    return jsonify({
        'plan': plan_data,
        'evidence': evidence,
        'experiences': experiences,
        'extracted_data': patient_data,
        'protocols': protocols,
        'confidence': round(dynamic_confidence, 1)
    })


@app.route('/recommend', methods=['POST'])
def recommend_treatment():
    try:
        data = request.get_json()
        patient_id = data.get('patientId')
        cancer_type = data.get('cancerType') or data.get('cancer_type')
        patient_query = data.get('query', '')
        patient_queries = data.get('queries', [])

        if not cancer_type:
            return jsonify({"error": "No cancer type provided."}), 400

        # Calculate age from DOB if age is not directly provided
        age = data.get('age')
        if age is None and data.get('dateOfBirth'):
            try:
                dob_str = data.get('dateOfBirth').split('T')[0] # Assuming ISO format 'YYYY-MM-DDTHH:MM:SS.sssZ'
                dob = datetime.strptime(dob_str, '%Y-%m-%d')
                today = datetime.now()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            except Exception as e:
                print(f"Warning: Could not calculate age from DOB: {e}")
                age = None # Fallback if DOB parsing fails
        
        # Extract detailed patient data including MRI and VCF
        patient_data_for_llm = {
            "patientId": patient_id,
            "cancer_type": cancer_type,
            "age": age,
            "kps": data.get('kps'),
            "stage": data.get('stage'),
            "genomicProfile": {
                "ER": data.get('ER'),
                "PR": data.get('PR'),
                "HER2": data.get('HER2'),
                "BRCA": data.get('BRCA'),
                "PDL1": data.get('PDL1'),
                "MGMT": data.get('MGMT'),
                "IDH": data.get('IDH'),
                "EGFR": data.get('EGFR'),
                "ALK": data.get('ALK'),
                "KRAS": data.get('KRAS'),
                "AFP": data.get('AFP'),
            },
            "mriPaths": data.get('mriPaths'),
            "vcfAnalysis": data.get('vcfAnalysis'),
            "pathologyAnalysis": data.get('pathologyAnalysis') # If you send this from frontend
        }

        # Clean up genomicProfile to remove None values
        patient_data_for_llm['genomicProfile'] = {k: v for k, v in patient_data_for_llm['genomicProfile'].items() if v is not None}

        # Step 1: Format a rich summary from the detailed data
        multimodal_summary = format_multimodal_data(patient_data_for_llm)

        # Step 2: Run rules engine
        rules = run_rules(patient_data_for_llm, cancer_type)
        
        # Step 3: Generate treatment plan using LLM
        plan_data, evidence, experiences = generate_treatment_plan(
            patient=multimodal_summary, # Pass the concise summary instead of the full object
            rules=rules, 
            evidence_levels=rules.get("evidence_levels", []),
            cancer=cancer_type, 
            query=patient_query, 
            queries=patient_queries
        )

        # Inject Personalization Insight from Rule Engine into plan_data
        if isinstance(plan_data, dict):
            plan_data["personalization_insight"] = rules.get("personalization_insight", "")
        else:
            plan_data = {
                "primary_treatment": str(plan_data),
                "personalization_insight": rules.get("personalization_insight", "")
            }

        # Calculate Dynamic Confidence Score
        avg_rag_score = sum([e.get('score', 0.5) for e in evidence]) / len(evidence) if evidence else 0.5
        dynamic_confidence = min(99.9, max(75.0, 95.0 - (avg_rag_score * 10)))

        # Construct Structured Protocols List
        if not isinstance(plan_data, dict):
             plan_data = {"primary_treatment": str(plan_data)}

        # ROBUST EXTRACTION
        primary_name = "Standard Protocol"
        p_tx = plan_data.get("primary_treatment")
        if isinstance(p_tx, dict):
            primary_name = p_tx.get("name") or p_tx.get("treatment") or p_tx.get("primary_treatment") or "Standard Protocol"
        elif isinstance(p_tx, str) and len(p_tx) > 3:
            primary_name = p_tx
        
        if len(str(primary_name)) < 5: primary_name = f"Standard {cancer_type} Protocol"

        protocols = [{
            "name": primary_name,
            "score": round(dynamic_confidence, 1),
            "duration": "12-18 months" if cancer_type == "Brain" else "6-12 months",
            "efficacy": "High",
            "toxicity": "Moderate",
            "cost": "High",
            "recommended": True
        }]

        # Helper to safely join lists that might contain strings or dicts
        def safe_join(items):
            if not items: return ""
            str_items = [i['treatment'] if isinstance(i, dict) else i for i in items]
            return ", ".join(filter(None, str_items))

        for i, alt in enumerate(rules.get("alternative_options", [])):
            protocols.append({
                "name": alt['treatment'] if isinstance(alt, dict) else alt,
                "score": round(dynamic_confidence - (i+1)*random.uniform(5, 10), 1),
                "duration": "6-12 months",
                "efficacy": "Moderate",
                "toxicity": "Low-Moderate",
                "cost": "Moderate",
                "recommended": False
            })

        if len(protocols) < 2:
            protocols.append({ "name": f"Targeted {cancer_type} Clinical Trial", "score": round(dynamic_confidence - 12.5, 1), "duration": "Variable", "efficacy": "Investigational", "toxicity": "Variable", "cost": "Trial-covered", "recommended": False })
        
        if len(protocols) < 3:
            protocols.append({ "name": f"Advanced {cancer_type} Research Protocol", "score": round(dynamic_confidence - 18.0, 1), "duration": "12-24 months", "efficacy": "High (Projected)", "toxicity": "Moderate", "cost": "Institutional", "recommended": False })

        return jsonify({
            'plan': plan_data,
            'evidence': evidence,
            'experiences': experiences, # Return structured experiences
            'protocols': protocols,
            'confidence': round(dynamic_confidence, 1)
        })
    except Exception as e:
        print(f"ERROR in recommend_treatment: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/predict_side_effects', methods=['POST'])
def predict_side_effects_route():
    data = request.get_json()
    try:
        # Calculate age from DOB if age is not directly provided
        age = data.get('age')
        if age is None and data.get('dateOfBirth'):
            try:
                dob_str = data.get('dateOfBirth').split('T')[0] # Assuming ISO format 'YYYY-MM-DDTHH:MM:SS.sssZ'
                dob = datetime.strptime(dob_str, '%Y-%m-%d')
                today = datetime.now()
                age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            except Exception as e:
                print(f"Warning: Could not calculate age from DOB: {e}")
                age = None # Fallback if DOB parsing fails
        
        cancer_type = data.get('cancerType') or data.get('cancer_type')
        if not cancer_type:
            return jsonify({"error": "No cancer type provided."}), 400

        

        patient_data_for_llm = {
            "patientId": data.get('patientId'),
            "cancer_type": cancer_type,
            "age": age, # Use the calculated age
            "kps": data.get('kps'),
            "stage": data.get('stage'),
            "genomicProfile": {
                "ER": data.get('ER'),
                "PR": data.get('PR'),
                "HER2": data.get('HER2'),
                "BRCA": data.get('BRCA'),
                "PDL1": data.get('PDL1'),
                "MGMT": data.get('MGMT'),
                "IDH": data.get('IDH'),
                "EGFR": data.get('EGFR'),
                "ALK": data.get('ALK'),
                "KRAS": data.get('KRAS'),
                "AFP": data.get('AFP'),
            },
            "mriPaths": data.get('mriPaths'),
            "vcfAnalysis": data.get('vcfAnalysis'),
            "pathologyAnalysis": data.get('pathologyAnalysis')
        }

        patient_data_for_llm['genomicProfile'] = {k: v for k, v in patient_data_for_llm['genomicProfile'].items() if v is not None}
        # Prepare queries
        cancer_type = patient_data_for_llm.get("cancer_type", "cancer")
        stage = patient_data_for_llm.get("stage", "")
        query = f"Predict side effects, survival, and QoL for {cancer_type} stage {stage}"
        queries = [query]

        # Format a rich summary for the LLM
        multimodal_summary = format_multimodal_data(patient_data_for_llm)

        # Call LLM with full context
        # outcome_data, evidence = predict_outcomes(...) <-- REPLACED WITH ENGINE

        # 1. Generate Treatment Plan first (to know which drugs to check for toxicity)
        if age is not None:
            age = int(age)
        rules = run_rules(patient_data_for_llm, cancer_type)
        plan_data, evidence, _ = generate_treatment_plan(
            patient=multimodal_summary,
            rules=rules,
            evidence_levels=rules.get("evidence_levels", []),
            cancer=cancer_type,
            query=query,
            queries=queries
        )

        # 2. Extract Drugs from Plan for Toxicity Check
        # Simple extraction from the primary treatment string
        primary_tx = plan_data.get("primary_treatment", "")
        if isinstance(primary_tx, dict):
            primary_tx = primary_tx.get("treatment", "")

        potential_drugs = primary_tx.replace('+', ',').replace('/', ',').split(',')
        drugs_list = [d.strip() for d in potential_drugs]

        # 3. Run Outcome Engine (Survival + Toxicity)
        survival_metrics = outcome_engine.predict_survival(patient_data_for_llm)
        toxicity_metrics = outcome_engine.predict_toxicity(drugs_list, patient_data_for_llm)

        # Calculate Dynamic Confidence Score
        avg_rag_score = sum([e.get('score', 0.5) for e in evidence]) / len(evidence) if evidence else 0.5
        dynamic_confidence = min(99.9, max(75.0, 95.0 - (avg_rag_score * 10)))

        # Map keys to match frontend expectations
        formatted_outcome = {
            "sideEffects": {
                "fatigue": toxicity_metrics.get("fatigue", 10),
                "nausea": toxicity_metrics.get("nausea", 10),
                "cognitive_impairment": toxicity_metrics.get("cognitive_impairment", 5),
                "hematologic_toxicity": toxicity_metrics.get("hematologic_toxicity", 5)
            },
            "overallSurvival": {
                "median": survival_metrics["median"],
                "range": [survival_metrics["range_min"], survival_metrics["range_max"]]
            },
            "progressionFreeSurvival": {
                "median": round(survival_metrics["median"] * 0.6, 1), # Approx PFS/OS ratio
                "range": [round(survival_metrics["range_min"] * 0.6, 1), round(survival_metrics["range_max"] * 0.6, 1)]
            },
            "riskStratification": {
                "low": 30 if survival_metrics["median"] > 24 else 10,
                "moderate": 50,
                "high": 20 if survival_metrics["median"] > 24 else 40
            },
            "prognosticFactors": {
                "Age": 85 if (age is not None and age > 65) else 45,
                "KPS Score": 90 if data.get('kps', 100) < 70 else 50,
                "Molecular Profile": 80,
                "Disease Burden": 70,
                "Treatment Intent": 60
            },
            "timelineProjection": {
                "months": ["Baseline", "3 mo", "6 mo", "12 mo", "18 mo", "24 mo"],
                "response_indicator": [100, 40, 35, 45, 55, 65],
                "quality_of_life": [
                    80, 
                    80 - toxicity_metrics.get("fatigue", 10)/2, 
                    80 - toxicity_metrics.get("nausea", 10)/2, 
                    75, 70, 65
                ]
            },
            "qualityOfLife": round(80 - (toxicity_metrics.get("fatigue", 0) + toxicity_metrics.get("nausea", 0))/4, 1),
            "evidence": evidence,
            "confidence": round(survival_metrics.get("confidence", dynamic_confidence), 1)
        }

        return jsonify(formatted_outcome)
    except Exception as e:
        print(f"Error in predict_side_effects_route: {e}")
        import traceback
        traceback.print_exc() # Print full traceback
        return jsonify({"error": str(e)}), 500


@app.route('/chat', methods=['POST'])
def chat_with_system():
    try:
        data = request.get_json()
        if not isinstance(data, dict):
            return jsonify({"error": "Invalid request format, expected JSON object"}), 400
            
        query = data.get('query')
        history = data.get('history', [])
        patient_data = data.get('patient_data', {})
        plan_data = data.get('plan_data', {})
        
        # Ensure patient_data is a dict
        if isinstance(patient_data, str):
            try:
                import json
                parsed = json.loads(patient_data)
                patient_data = parsed if isinstance(parsed, dict) else {}
            except:
                patient_data = {}
        
        # Ensure plan_data is a dict
        if isinstance(plan_data, str):
            try:
                import json
                parsed = json.loads(plan_data)
                plan_data = parsed if isinstance(parsed, dict) else {}
            except:
                plan_data = {}
                
        # Final safety check
        if not isinstance(patient_data, dict): patient_data = {}
        if not isinstance(plan_data, dict): plan_data = {}
                
        cancer_type = patient_data.get('cancer_type', 'cancer') if isinstance(patient_data, dict) else 'cancer'

        print(f"[CHAT] Received query: {query}")

        if not query:
            return jsonify({"error": "No query provided"}), 400

        # Format patient and plan context for the LLM
        multimodal_summary = format_multimodal_data(patient_data)
        
        response, evidence = query_treatment_plan(
            patient=multimodal_summary,
            plan=plan_data,
            query=query,
            cancer=cancer_type,
            history=history
        )

        return jsonify({
            'response': response,
            'evidence': evidence
        })
    except Exception as e:
        print(f"ERROR in chat_with_system: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/process_vcf', methods=['POST'])
def process_vcf_route():
    data = request.get_json()
    if not data or 'file_path' not in data:
        return jsonify({"error": "No VCF file path provided"}), 400

    file_path = data['file_path']
    result = parse_vcf(file_path)

    if not result.get("success"):
        return jsonify({"error": result.get("error", "VCF Parsing failed")}), 500

    return jsonify(result)

@app.route('/format_evidence', methods=['POST'])
def format_evidence_route():
    try:
        data = request.get_json()
        if not data or 'evidence' not in data:
            return jsonify({"error": "No evidence provided"}), 400
        
        evidence_list = data['evidence']
        formatted_text = format_evidence_llm(evidence_list)
        
        return jsonify({
            "success": True,
            "formattedText": formatted_text
        })
    except Exception as e:
        print(f"Error in format_evidence_route: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route('/generate_pathway', methods=['POST'])
def generate_pathway_route():
    try:
        data = request.get_json()
        if not data or 'plan' not in data:
            return jsonify({"error": "No plan provided"}), 400
        
        plan = data['plan']
        formatted_pathway = format_pathway_llm(plan)
        
        return jsonify({
            "success": True,
            "pathway": formatted_pathway
        })
    except Exception as e:
        print(f"Error in generate_pathway_route: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)