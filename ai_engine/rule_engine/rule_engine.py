# rule_engine.py

import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB_DIR = os.path.join(BASE_DIR, "knowledge_base")

# Load all KB files into memory
KB = {
    "breast": json.load(open(os.path.join(KB_DIR, "breast_kb.json"), encoding="utf-8")),
    "brain": json.load(open(os.path.join(KB_DIR, "brain_kb.json"), encoding="utf-8")),
    "lung": json.load(open(os.path.join(KB_DIR, "lung_kb.json"), encoding="utf-8")),
    "liver": json.load(open(os.path.join(KB_DIR, "liver_kb.json"), encoding="utf-8")),
    "pancreas": json.load(open(os.path.join(KB_DIR, "pancreas_kb.json"), encoding="utf-8")),
    "common": json.load(open(os.path.join(KB_DIR, "common_kb.json"), encoding="utf-8"))
}


def run_rules(patient, cancer_type):
    cancer = cancer_type.lower()
    
    # 1. CANCER-SPECIFIC STAGING LOGIC
    stage = str(patient.get("stage", "")).upper()
    
    if cancer == "brain":
        if stage not in ["LOCALIZED", "RECURRENT"]:
            if patient.get("prior_radiation") == "yes" or "RECURRENT" in str(patient.get("diagnosis", "")).upper():
                stage = "RECURRENT"
            else:
                stage = "LOCALIZED"
    elif not stage:
        # Default staging based on KB keys
        if cancer == "liver":
            stage = "EARLY"
        elif cancer == "pancreas":
            stage = "RESECTABLE"
        elif cancer == "breast":
            stage = "I" # Breast has 0, I, II, III, IV
        else:
            print(f"[Rule Engine] Warning: No stage provided for {cancer}. Defaulting to Stage I.")
            stage = "I"
        
    # 2. Extract History & Performance
    kps = int(patient.get("kps") if patient.get("kps") is not None else 100)
    ecog = int(patient.get("ecog") if patient.get("ecog") is not None else 0)
    comorbidities = str(patient.get("comorbidities") or "").lower()
    age = int(patient.get("age") if patient.get("age") is not None else 50)

    # Clean biomarker values (Normalization)
    idh1 = str(patient.get("IDH1", "")).lower().strip()
    mgmt = str(patient.get("MGMT", "")).lower().strip()
    codeletion = str(patient.get("1p19q", "")).lower().strip() 
    resection = str(patient.get("resection", "")).lower().strip() 
    symptoms_list = str(patient.get("symptoms", "")).lower()
    
    brca = str(patient.get("BRCA", "")).lower()
    pdl1 = str(patient.get("PDL1", ""))
    egfr = str(patient.get("EGFR", ""))
    alk = str(patient.get("ALK", ""))
    kras = str(patient.get("KRAS", ""))
    residual = str(patient.get("residual", "")).lower()

    if cancer not in KB or cancer == "common":
        return {"error": f"Cancer type '{cancer}' not supported."}

    cancer_kb = KB[cancer]
    stages = cancer_kb.get("stages", {})

    if stage not in stages:
        return {"error": f"No treatment rules found for status '{stage}' in {cancer}."}

    # --- DEEP PERSONALIZATION LOGIC (BRANCHING) ---
    data = stages[stage]
    personalization_rationale = []

    # A. COMMON COMORBIDITY-DRIVEN SHIFTS (Safety First)
    if "heart" in comorbidities or "cardiac" in comorbidities:
        personalization_rationale.append("Cardiac Safety Protocol: Standard Anthracyclines/Trastuzumab flagged for cardiotoxicity. Baseline LVEF required.")
    if "kidney" in comorbidities or "renal" in comorbidities:
        personalization_rationale.append("Renal Impairment Detected: Dose-reduction required for Cisplatin/Platinum-based agents.")
    if "diabetes" in comorbidities:
        personalization_rationale.append("Metabolic Monitoring: High-dose Dexamethasone requires strict glycemic control.")

    # B. CANCER-SPECIFIC DEEP LOGIC
    if cancer == "brain" and stage == "LOCALIZED":
        # 1. Performance Status (The Frail Floor)
        if kps <= 60 or ecog >= 3:
            data = stages[stage].get("palliative", stages[stage].get("default", data))
            personalization_rationale.append("WHO Performance Alert: BSC prioritized due to high frailty risk.")
        
        # 2. The 'Holy Grail' Branch: Oligodendroglioma vs Astrocytoma
        elif "deleted" in codeletion or "positive" in codeletion:
            data = stages[stage].get("oligodendroglioma", stages[stage].get("default", data))
            personalization_rationale.append("RESEARCH INSIGHT: 1p/19q Co-deletion confirms Oligodendroglioma. PCV regimen selected per RTOG 9402.")
        
        # 3. Age-Based Adjustment
        elif age >= 65:
            if "unmethylated" in mgmt:
                data = {
                    "primary_treatments": [{"treatment": "Hypofractionated RT (40Gy/15fx) alone", "evidence": "Level 1"}],
                    "rationale": "In elderly patients with MGMT-unmethylated tumors, adding TMZ provides no survival benefit."
                }
                personalization_rationale.append("Elderly + MGMT-Unmethylated: TMZ omitted to prevent useless toxicity.")
            else:
                data = stages[stage].get("elderly_frail", stages[stage].get("default", data))
                personalization_rationale.append("Age-Cohort Optimization: Perry Regimen (3-week course) selected.")

        # 4. Aggressive Phenotyping
        elif "wild" in idh1 or "wt" in idh1:
            data = stages[stage].get("idh_wildtype", stages[stage].get("default", data))
            personalization_rationale.append("NOMENCLATURE: IDH-Wildtype Glioblastoma. Optimal treatment includes TTFields (Optune).")
        
        # 5. Resection Impact
        if "subtotal" in resection or "biopsy" in resection:
            personalization_rationale.append("Surgical Delta: Subtotal resection detected. Higher urgency for adjuvant therapy.")

        # 6. Cortical Symptom Management
        if "seizure" in symptoms_list or "convulsion" in symptoms_list:
            personalization_rationale.append("Symptom Control: Levetiracetam (Keppra) recommended.")
        if "edema" in symptoms_list or "headache" in symptoms_list:
            personalization_rationale.append("Vasogenic Edema: Dexamethasone taper required.")

    elif cancer == "breast":
        er_pos = "positive" in str(patient.get("ER", "")).lower()
        her2_pos = "positive" in str(patient.get("HER2", "")).lower()
        
        if her2_pos:
            personalization_rationale.append("HER2-Driven Protocol: Anti-HER2 targeted therapy is the backbone.")
        elif er_pos:
            personalization_rationale.append("Endocrine-Sensitive: Prioritizing Hormone Therapy + CDK4/6 Inhibitors.")
        else:
            personalization_rationale.append("Triple Negative (TNBC): Aggressive Poly-chemotherapy + Immunotherapy indicated.")

    elif cancer == "lung":
        egfr_mut = "mutated" in egfr.lower() or "positive" in egfr.lower()
        if egfr_mut:
            personalization_rationale.append("EGFR Driver Mutation: 1st Line Osimertinib (TKI) is mandatory.")
        elif "alk" in alk.lower() or "positive" in alk.lower():
            personalization_rationale.append("ALK Rearrangement: Alectinib indicated for superior CNS penetration.")
        elif ">50" in pdl1 or "high" in pdl1.lower():
            personalization_rationale.append("PD-L1 High (≥50%): Eligible for Pembrolizumab monotherapy.")

    elif cancer == "liver":
        afp_val = str(patient.get("AFP", "")).lower()
        if "high" in afp_val or "elevated" in afp_val:
            personalization_rationale.append("Aggressive AFP Phenotype: Predictive of faster recurrence.")

    # --- RESULTS AGGREGATION ---
    final_insight = " | ".join(personalization_rationale) if personalization_rationale else "Standard of care protocol."

    def get_names(items):
        if not items: return []
        return [i["treatment"] if isinstance(i, dict) else i for i in items]

    result = {
        "primary_treatments": get_names(data.get("primary_treatments", [])),
        "surgery": get_names(data.get("surgery", [])),
        "radiation": get_names(data.get("radiation", [])),
        "systemic": get_names(data.get("systemic", [])),
        "targeted": get_names(data.get("targeted", [])),
        "immunotherapy": get_names(data.get("immunotherapy", [])),
        "alternative_options": data.get("alternatives", []),
        "follow_up": data.get("follow_up", []),
        "contraindications": [],
        "warnings": [],
        "evidence_levels": [],
        "personalization_insight": final_insight,
        "performance_adjustment": f"Protocol optimized for {cancer.capitalize()} {stage.capitalize()} based on standard of care guidelines.",
        "evidence": KB["common"]["evidence"]
    }

    # Collect Evidence Levels
    for cat in ["primary_treatments", "surgery", "radiation", "systemic", "targeted", "immunotherapy"]:
        items = data.get(cat, [])
        for item in items:
            if isinstance(item, dict) and "evidence" in item:
                result["evidence_levels"].append({
                    "treatment": item["treatment"],
                    "level": item["evidence"]
                })

    # 3. PERFORMANCE STATUS ADJUSTMENTS
    if kps < 70 or ecog >= 2:
        result["performance_adjustment"] = "Patient considered frail. Prioritize palliative intent."
        result["warnings"].append("Low performance status detected.")

    # 4. COMORBIDITY-SPECIFIC RULES (Global Warnings)
    if "heart" in comorbidities or "cardiac" in comorbidities:
        result["contraindications"].extend(KB["common"]["contraindications"].get("cardiac", []))
        result["warnings"].append("Cardiac history detected.")
    
    if "kidney" in comorbidities or "renal" in comorbidities or "dialysis" in comorbidities:
        result["contraindications"].extend(KB["common"]["contraindications"].get("renal", []))
        result["warnings"].append("Renal impairment detected.")

    if "diabetes" in comorbidities:
        result["warnings"].append("Diabetic history detected.")

    # 5. BIOMARKER AUGMENTATIONS (Original Logic)
    if cancer == "breast":
        if brca == "positive" and "brca" in data:
            result["brca_options"] = data["brca"]
        if residual == "yes" and "residual" in data:
            result["residual_disease"] = data["residual"]

    if cancer == "lung":
        biomarker_hits = []
        if egfr: biomarker_hits.append(data.get("targeted", {}).get("EGFR"))
        if alk: biomarker_hits.append(data.get("targeted", {}).get("ALK"))
        if kras: biomarker_hits.append(data.get("targeted", {}).get("KRAS"))
        result["biomarker_targets"] = [b for b in biomarker_hits if b]
        if pdl1 and data.get("immunotherapy"):
            result["immunotherapy_candidates"] = data["immunotherapy"]

    if not result["follow_up"]:
        result["follow_up"] = KB["common"]["follow_up"]["standard"]

    return result
