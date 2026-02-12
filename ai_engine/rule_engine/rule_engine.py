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
    
    # 1. BRAIN SPECIFIC STAGING LOGIC
    if cancer == "brain":
        stage = str(patient.get("stage", "")).upper()
        if stage not in ["LOCALIZED", "RECURRENT"]:
            if patient.get("prior_radiation") == "yes" or "RECURRENT" in str(patient.get("diagnosis", "")).upper():
                stage = "RECURRENT"
            else:
                stage = "LOCALIZED"
    else:
        stage = str(patient.get("stage", "")).upper()
        if not stage:
            print(f"[Rule Engine] Warning: No stage provided for {cancer}. Defaulting to Stage I.")
            stage = "I"
        
    # 2. Extract History & Performance
    kps = int(patient.get("kps", 100))
    ecog = int(patient.get("ecog", 0))
    comorbidities = str(patient.get("comorbidities", "")).lower()
    age = int(patient.get("age", 50))

    residual = str(patient.get("residual", "")).lower()
    brca = str(patient.get("BRCA", "")).lower()
    pdl1 = str(patient.get("PDL1", ""))
    egfr = str(patient.get("EGFR", ""))
    alk = str(patient.get("ALK", ""))
    kras = str(patient.get("KRAS", ""))

    if cancer not in KB or cancer == "common":
        return {"error": f"Cancer type '{cancer}' not supported."}

    cancer_kb = KB[cancer]
    stages = cancer_kb.get("stages", {})

    if stage not in stages:
        return {"error": f"No treatment rules found for status '{stage}' in {cancer}."}

    data = stages[stage]

    result = {
        "primary_treatments": data.get("primary_treatments", []),
        "surgery": data.get("surgery", []),
        "radiation": data.get("radiation", []),
        "systemic": data.get("systemic", []),
        "targeted": data.get("targeted", {}),
        "immunotherapy": data.get("immunotherapy", []),
        "alternative_options": data.get("alternatives", []),
        "follow_up": data.get("follow_up", []),
        "contraindications": [],
        "warnings": [],
        "performance_adjustment": f"Protocol optimized for {cancer.capitalize()} {stage.capitalize()} based on standard of care guidelines.",
        "evidence": KB["common"]["evidence"]
    }

    # 3. PERFORMANCE STATUS ADJUSTMENTS
    if kps < 70 or ecog >= 2:
        result["performance_adjustment"] = "Patient considered frail. Prioritize palliative intent, hypofractionated radiation, or monotherapy to minimize toxicity."
        result["warnings"].append("Low performance status detected. Standard aggressive protocols may be poorly tolerated.")

    # 4. COMORBIDITY-SPECIFIC RULES
    if "heart" in comorbidities or "cardiac" in comorbidities:
        result["contraindications"].extend(KB["common"]["contraindications"].get("cardiac", []))
        result["warnings"].append("Cardiac history detected. Avoid cardiotoxic agents like Anthracyclines or Trastuzumab without cardiology clearance.")
    
    if "kidney" in comorbidities or "renal" in comorbidities or "dialysis" in comorbidities:
        result["contraindications"].extend(KB["common"]["contraindications"].get("renal", []))
        result["warnings"].append("Renal impairment detected. Dose-adjustment required for platinum-based agents or other renally cleared drugs.")

    if "diabetes" in comorbidities:
        result["warnings"].append("Diabetic history detected. Monitor glucose levels during steroid-heavy phases of treatment.")

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
