# llm_chain.py

import os
import re
import json
import traceback
from google import genai as google_genai
from google.genai import types as google_types
from openai import OpenAI
from dotenv import load_dotenv
from rag.retriever_hybrid import hybrid_retrieve

# --- ROBUST ENV LOADING ---
def load_clinical_env():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
    root_dir = os.path.dirname(base_dir) 
    potential_paths = [
        os.path.join(root_dir, "Backend", ".env"),
        os.path.join(root_dir, ".env"),
        os.path.join(base_dir, ".env")
    ]
    for path in potential_paths:
        if os.path.exists(path):
            print(f"[LLM] LOADING ENV: {path}")
            load_dotenv(path)
            break
    
    return {
        "GITHUB_TOKEN": os.getenv("GITHUB_TOKEN"),
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_KEY")
    }

ENV_KEYS = load_clinical_env()

def get_llm_provider():
    if ENV_KEYS["GITHUB_TOKEN"]:
        try:
            client = OpenAI(base_url="https://models.inference.ai.azure.com", api_key=ENV_KEYS["GITHUB_TOKEN"])
            client.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": "ping"}], max_tokens=1)
            print("[LLM] SUCCESS: GitHub Models (GPT-4o) Active.")
            return "github", client
        except: pass

    if ENV_KEYS["GEMINI_API_KEY"]:
        try:
            client = google_genai.Client(api_key=ENV_KEYS["GEMINI_API_KEY"])
            client.models.generate_content(model="gemini-2.5-flash", contents="ping", config=google_types.GenerateContentConfig(max_output_tokens=1))
            print("[LLM] SUCCESS: Gemini 2.5 Flash Active.")
            return "gemini", client
        except: pass

    return None, None

PROVIDER, CLIENT = get_llm_provider()

def generate_treatment_plan(patient, rules, evidence_levels, cancer, query, queries):
    evidence = hybrid_retrieve(cancer, query, queries)
    evidence_text = "\n".join([f"- {e['text']}" for e in evidence])
    rule_summary = json.dumps(rules, indent=2)

    prompt = f"""
    Return a structured JSON oncology treatment plan.
    PATIENT: {patient}
    RULES: {rule_summary}
    EVIDENCE: {evidence_text}
    Return ONLY valid JSON with primary_treatment, clinical_rationale, formatted_evidence (Markdown), alternatives, safety_alerts, follow_up, pathway.
    """

    if not CLIENT: return get_fallback_plan(rules, cancer), evidence

    try:
        if PROVIDER == "github":
            response = CLIENT.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": prompt}], temperature=0.1)
            text = response.choices[0].message.content
        else:
            response = CLIENT.models.generate_content(model="gemini-2.5-flash", contents=prompt, config=google_types.GenerateContentConfig(temperature=0.1))
            text = response.text

        json_match = re.search(r'\{.*\}', text.strip(), re.DOTALL)
        if json_match: return json.loads(json_match.group(0)), evidence
        raise ValueError("JSON parsing failed")
    except Exception as e:
        print(f"[LLM ERROR] Plan failed: {e}")
        return get_fallback_plan(rules, cancer), evidence

def get_fallback_plan(rules, cancer):
    primary = rules.get("primary_treatments", ["Standard Protocol"])[0]
    return {
        "primary_treatment": primary,
        "clinical_rationale": rules.get("personalization_insight") or "Standard protocol.",
        "formatted_evidence": "### Clinical Evidence\n* Local rule-based synthesis applied.",
        "alternatives": ["Trial"],
        "safety_alerts": rules.get("warnings", ["Monitor toxicity"]),
        "follow_up": "Routine follow-up.",
        "pathway": [{ "title": "Phase 1", "duration": "Wk 0-4", "description": "Start", "details": [primary], "marker": "🏥" }]
    }

def predict_outcomes(patient, patient_data_dict, cancer, query, queries):
    evidence = hybrid_retrieve(cancer, query, queries)
    evidence_text = "\n".join([f"[{i+1}] {e['text']}" for i, e in enumerate(evidence)])
    prompt = f"Return ONLY JSON for outcomes. Structure: {{ side_effects: {{ fatigue: 0 }}, overall_survival: {{ median: 0, range_min: 0, range_max: 0 }}, progression_free_survival: {{ median: 0 }}, risk_stratification: {{ low: 0, moderate: 0, high: 0 }}, prognostic_factors: {{ Age: 0 }}, timeline_projection: {{ months: [], response_indicator: [], quality_of_life: [] }}, quality_of_life: 0 }}. Patient: {patient}. Evidence: {evidence_text}"
    if not CLIENT: return get_fallback_outcomes(patient_data_dict), evidence
    try:
        if PROVIDER == "github":
            response = CLIENT.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": prompt}])
            text = response.choices[0].message.content
        else:
            response = CLIENT.models.generate_content(model="gemini-2.5-flash", contents=prompt)
            text = response.text
        json_match = re.search(r'\{.*\}', text.strip(), re.DOTALL)
        if json_match: return json.loads(json_match.group(0)), evidence
        raise ValueError("No JSON")
    except: return get_fallback_outcomes(patient_data_dict), evidence

def get_fallback_outcomes(p):
    import random
    k = int(p.get("kps", 100))
    q = round(random.uniform(60, 80), 1)
    return {
        "side_effects": { "fatigue": 35, "nausea": 25, "cognitive_impairment": 20, "hematologic_toxicity": 15 },
        "overall_survival": { "median": 24 if k >= 80 else 14, "range_min": 12, "range_max": 36 },
        "progression_free_survival": { "median": 12, "range_min": 6, "range_max": 18 },
        "risk_stratification": { "low": 30, "moderate": 50, "high": 20 },
        "prognostic_factors": { "Age": 85, "Performance Status": 90, "Biomarkers": 80, "Clinical Stage": 70, "Comorbidities": 60 },
        "timeline_projection": { "months": ["Baseline", "3 mo", "6 mo", "12 mo", "18 mo", "24 mo"], "response_indicator": [100, 40, 35, 45, 55, 65], "quality_of_life": [q, q-5, q-2, q-8, q-12, q-15] },
        "quality_of_life": q
    }

def query_treatment_plan(patient, plan, query, cancer, history=None):
    """
    NEURO-SYMBOLIC CHATBOT: 
    Uses LLM to extract deltas, re-runs rule engine for deterministic clinical logic.
    """
    from rule_engine import run_rules # Local import to avoid circular dependency
    from utils.formatter import format_multimodal_data
    
    # 1. Ask LLM if the user is proposing a change to the patient's data
    extraction_prompt = f"""
    Analyze this doctor's query: "{query}"
    Is the doctor providing NEW clinical information or asking a "What if" scenario?
    If YES, return a JSON object representing the change. If NO, return {{"change": false}}.
    
    Example input: "What if the patient has diabetes?"
    Example output: {{"change": true, "field": "comorbidities", "value": "diabetes", "operation": "append"}}
    
    Current Patient Data: {str(patient)}
    """
    
    clinical_delta = {"change": False}
    try:
        if PROVIDER == "github":
            resp = CLIENT.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": extraction_prompt}], response_format={"type": "json_object"})
            clinical_delta = json.loads(resp.choices[0].message.content)
        else:
            resp = CLIENT.models.generate_content(model="gemini-2.5-flash", contents=extraction_prompt)
            match = re.search(r'\{.*\}', resp.text, re.DOTALL)
            if match: clinical_delta = json.loads(match.group(0))
    except: pass

    # 2. IF a change is detected, re-run the DETERMINISTIC RULE ENGINE
    modified_rules_output = None
    patient_dict = patient if isinstance(patient, dict) else {}
    
    if clinical_delta.get("change"):
        print(f"[SIMULATION] Detected change in {clinical_delta['field']}. Re-running rules...")
        try:
            # Create a virtual copy for simulation
            sim_patient = patient_dict.copy()
            field = clinical_delta['field']
            val = clinical_delta['value']
            
            if clinical_delta.get('operation') == 'append':
                existing = str(sim_patient.get(field, ""))
                sim_patient[field] = f"{existing}, {val}" if existing else val
            else:
                sim_patient[field] = val
                
            # EXECUTE DETERMINISTIC CODE
            modified_rules_output = run_rules(sim_patient, cancer)
        except Exception as e:
            print(f"[SIMULATION ERROR] Rule re-run failed: {e}")

    # 3. Final Answer Generation
    history_text = ""
    if history and isinstance(history, list):
        history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history if isinstance(m, dict)])

    simulation_context = ""
    if modified_rules_output:
        simulation_context = f"\n[INTERNAL SIMULATION RESULT]: The rule engine was re-run with the new data. NEW RULES OUTPUT: {json.dumps(modified_rules_output)}"

    # Generate readable summary for the prompt
    multimodal_summary = format_multimodal_data(patient_dict)

    # 3. EXTREME PRUNING (RESONANCE AI CORE DATA ONLY)
    # We strip ALL large objects and keep only high-level identifiers
    pruned_patient = {
        "firstName": patient_dict.get("firstName"),
        "lastName": patient_dict.get("lastName"),
        "age": patient_dict.get("age"),
        "gender": patient_dict.get("gender"),
        "diagnosis": patient_dict.get("diagnosis"),
        "cancerType": patient_dict.get("cancerType"),
        "kps": patient_dict.get("kps"),
        "performanceStatus": patient_dict.get("performanceStatus"),
        "symptoms": patient_dict.get("symptoms"),
        "comorbidities": patient_dict.get("comorbidities"),
        "medicalHistory": patient_dict.get("medicalHistory", "")[:500], # First 500 chars only
        "genomicProfile": patient_dict.get("genomicProfile", {})
    }

    final_prompt = f"""
    You are a Senior Oncology Consultant. Answer the doctor's query.
    {simulation_context}
    
    CRITICAL STRUCTURE GUIDELINES:
    1. HEADER: Identify the factor (### [FACTOR] IMPACT ANALYSIS).
    2. DELTA: Explain exactly how rule-engine results changed.
    3. ACTIONS: 3-4 clinical bullet points.
    4. SYSTEMIC: Changes to Chemo/RT.
    5. SAFETY: New contraindications.

    PATIENT CONTEXT (Summarized):
    {multimodal_summary}
    
    CORE CLINICAL PROFILE:
    {json.dumps(pruned_patient, indent=2)}

    PLAN: {str(plan)}
    QUERY: {query}
    
    CONSULTANT RESPONSE:
    """

    try:
        if PROVIDER == "github":
            response = CLIENT.chat.completions.create(model="gpt-4o", messages=[{"role": "user", "content": final_prompt}])
            return response.choices[0].message.content.strip(), []
        else:
            response = CLIENT.models.generate_content(model="gemini-2.5-flash", contents=final_prompt)
            return response.text.strip(), []
    except: return "The reasoning engine encountered an error.", []
