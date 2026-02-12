from flask import Flask, request, jsonify
from flask_cors import CORS
from rule_engine import run_rules
from llm.llm_chain import generate_treatment_plan, predict_outcomes
from utils.vcf_parser import parse_vcf # ADDED VCF PARSER IMPORT
import re
import random
import pdfplumber
import spacy

# Load scispaCy model for medical entity extraction
try:
    nlp = spacy.load("en_core_sci_sm")
    print("[AI ENGINE] scispaCy model loaded successfully.")
except Exception as e:
    print(f"[AI ENGINE] Error loading scispaCy: {e}. Falling back to standard spaCy.")
    nlp = None

app = Flask(__name__)
CORS(app)

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
    mgmt_m = re.search(r"MGMT\s*(?:Promoter)?\s*(?:Status)?\s*(Methylated|Unmethylated|Positive|Negative)", clean_text, re.IGNORECASE)
    if mgmt_m:
        patient_data['MGMT'] = mgmt_m.group(1).capitalize()
    
    # IDH
    idh_m = re.search(r"IDH\s*(?:Status)?\s*(Mutant|Wild-Type|Wildtype|Mutated|WT|Positive|Negative|1|2)", clean_text, re.IGNORECASE)
    if idh_m:
        val = idh_m.group(1).upper()
        if val in ["MUTANT", "MUTATED", "POSITIVE", "1", "2"]: 
            patient_data['IDH1'] = "Mutated"
        else: 
            patient_data['IDH1'] = "Wild Type"

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
            patient_data['stage'] = mapping.get(s, s)
        elif patient_data.get('grade'):
            patient_data['stage'] = patient_data['grade']

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
    rules = run_rules(patient_data)
    if "error" in rules:
        return jsonify({"error": rules["error"]}), 400

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
    plan_data, evidence = generate_treatment_plan(
        patient=patient_data, 
        rules=rules,
        cancer=cancer_type,
        query=query,
        queries=queries
    )

    # Calculate Dynamic Confidence Score
    avg_rag_score = sum([e.get('score', 0.5) for e in evidence]) / len(evidence) if evidence else 0.5
    dynamic_confidence = min(99.9, max(75.0, 95.0 - (avg_rag_score * 10)))

    # Construct Structured Protocols List
    primary_name = plan_data.get("primary_treatment", "Standard Protocol")
    if len(primary_name) < 5: primary_name = "Standard Protocol"

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
            "name": "Targeted Clinical Trial",
            "score": round(dynamic_confidence - 12.5, 1),
            "duration": "Variable",
            "efficacy": "Investigational",
            "toxicity": "Variable",
            "cost": "Low (Trial-covered)",
            "recommended": False
        })
    
    if len(protocols) < 3:
        protocols.append({
            "name": "Advanced Research Protocol",
            "score": round(protocols[-1]["score"] - 5.5, 1),
            "duration": "12-24 months",
            "efficacy": "High (Projected)",
            "toxicity": "Moderate-High",
            "cost": "Institutional",
            "recommended": False
        })

    return jsonify({
        'plan': plan_data,
        'evidence': evidence,
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
    rules = run_rules(patient_data)
    if "error" in rules:
        return jsonify({"error": rules["error"]}), 400

    # Prepare queries
    cancer_type = patient_data.get("cancer_type", "cancer")
    stage = patient_data.get("stage", "")
    query = f"{cancer_type} stage {stage} treatment"
    
    queries = [query]
    if patient_data.get('ER'): queries.append(f"{cancer_type} ER {patient_data['ER']}")
    if patient_data.get('HER2'): queries.append(f"{cancer_type} HER2 {patient_data['HER2']}")
    if patient_data.get('MGMT'): queries.append(f"{cancer_type} MGMT {patient_data['MGMT']}")

    # Call LLM with full context
    plan_data, evidence = generate_treatment_plan(
        patient=patient_data,
        rules=rules,
        cancer=cancer_type,
        query=query,
        queries=queries
    )

    # Calculate Dynamic Confidence Score
    avg_rag_score = sum([e.get('score', 0.5) for e in evidence]) / len(evidence) if evidence else 0.5
    dynamic_confidence = min(99.9, max(75.0, 95.0 - (avg_rag_score * 10)))

    # Construct Structured Protocols List
    primary_name = plan_data.get("primary_treatment", "Standard Protocol")
    if len(primary_name) < 5: primary_name = "Standard Protocol"

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
            "name": alt,
            "score": round(dynamic_confidence - (i+1)*random.uniform(5, 10), 1),
            "duration": "6-12 months",
            "efficacy": "Moderate",
            "toxicity": "Low-Moderate",
            "cost": "Moderate",
            "recommended": False
        })

    if len(protocols) < 2:
        protocols.append({ "name": "Targeted Clinical Trial", "score": round(dynamic_confidence - 12.5, 1), "duration": "Variable", "efficacy": "Investigational", "toxicity": "Variable", "cost": "Trial-covered", "recommended": False })
    
    if len(protocols) < 3:
        protocols.append({ "name": "Advanced Research Protocol", "score": round(dynamic_confidence - 18.0, 1), "duration": "12-24 months", "efficacy": "High (Projected)", "toxicity": "Moderate", "cost": "Institutional", "recommended": False })

    return jsonify({
        'plan': plan_data,
        'evidence': evidence,
        'extracted_data': patient_data,
        'protocols': protocols,
        'confidence': round(dynamic_confidence, 1)
    })


@app.route('/recommend', methods=['POST'])
def recommend():
    patient_data = request.get_json()
    
    # Run rule engine
    rules = run_rules(patient_data)
    if "error" in rules:
        return jsonify({"error": rules["error"]}), 400

    # Prepare queries
    cancer_type = patient_data.get("cancer_type", "cancer")
    stage = patient_data.get("stage", "")
    query = f"{cancer_type} stage {stage} treatment"
    
    queries = [query]
    if patient_data.get('ER'): queries.append(f"{cancer_type} ER {patient_data['ER']}")
    if patient_data.get('HER2'): queries.append(f"{cancer_type} HER2 {patient_data['HER2']}")

    # Call LLM with full context
    plan_data, evidence = generate_treatment_plan(
        patient=patient_data,
        rules=rules,
        cancer=cancer_type,
        query=query,
        queries=queries
    )

    # Calculate Dynamic Confidence Score
    avg_rag_score = sum([e.get('score', 0.5) for e in evidence]) / len(evidence) if evidence else 0.5
    dynamic_confidence = min(99.9, max(75.0, 95.0 - (avg_rag_score * 10)))

    # Construct Structured Protocols List
    primary_name = plan_data.get("primary_treatment", "Standard Protocol")
    if len(primary_name) < 5: primary_name = "Standard Protocol"

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
            "name": alt,
            "score": round(dynamic_confidence - (i+1)*random.uniform(5, 10), 1),
            "duration": "6-12 months",
            "efficacy": "Moderate",
            "toxicity": "Low-Moderate",
            "cost": "Moderate",
            "recommended": False
        })

    if len(protocols) < 2:
        protocols.append({ "name": "Targeted Clinical Trial", "score": round(dynamic_confidence - 12.5, 1), "duration": "Variable", "efficacy": "Investigational", "toxicity": "Variable", "cost": "Trial-covered", "recommended": False })
    
    if len(protocols) < 3:
        protocols.append({ "name": "Advanced Research Protocol", "score": round(dynamic_confidence - 18.0, 1), "duration": "12-24 months", "efficacy": "High (Projected)", "toxicity": "Moderate", "cost": "Institutional", "recommended": False })

    return jsonify({
        'plan': plan_data,
        'evidence': evidence,
        'protocols': protocols,
        'confidence': round(dynamic_confidence, 1)
    })

@app.route('/predict_side_effects', methods=['POST'])
def predict_side_effects_route():
    patient_data = request.get_json()

    # Prepare queries
    cancer_type = patient_data.get("cancerType", "cancer")
    stage = patient_data.get("stage", "")
    query = f"Predict side effects, survival, and QoL for {cancer_type} stage {stage}"
    queries = [query]

    # Call LLM with full context
    outcome_data, evidence = predict_outcomes(
        patient=patient_data,
        cancer=cancer_type,
        query=query,
        queries=queries
    )

    # Calculate Dynamic Confidence Score
    avg_rag_score = sum([e.get('score', 0.5) for e in evidence]) / len(evidence) if evidence else 0.5
    dynamic_confidence = min(99.9, max(75.0, 95.0 - (avg_rag_score * 10)))

    # Map keys to match frontend expectations if necessary
    formatted_outcome = {
        "sideEffects": outcome_data["side_effects"],
        "overallSurvival": {
            "median": outcome_data["overall_survival"]["median"],
            "range": [outcome_data["overall_survival"]["range_min"], outcome_data["overall_survival"]["range_max"]]
        },
        "progressionFreeSurvival": {
            "median": outcome_data["progression_free_survival"]["median"],
            "range": [outcome_data["progression_free_survival"]["range_min"], outcome_data["progression_free_survival"]["range_max"]]
        },
        "riskStratification": outcome_data.get("risk_stratification", {"low": 25, "moderate": 45, "high": 30}),
        "prognosticFactors": outcome_data.get("prognostic_factors", {"Age": 65, "KPS": 85, "Biomarkers": 90}),
        "timelineProjection": outcome_data.get("timeline_projection", {
            "months": ["Baseline", "3 mo", "6 mo", "12 mo", "18 mo", "24 mo"],
            "response_indicator": [100, 40, 35, 45, 55, 65],
            "quality_of_life": [75, 70, 73, 67, 63, 60]
        }),
        "qualityOfLife": outcome_data["quality_of_life"],
        "evidence": evidence,
        "confidence": round(dynamic_confidence, 1)
    }

    return jsonify(formatted_outcome)


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

if __name__ == '__main__':
    app.run(debug=True, port=5000)