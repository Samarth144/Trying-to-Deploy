# llm_chain.py

import os
import re
import json
import traceback
import ollama
from google import genai as google_genai
from google.genai import types as google_types
from openai import OpenAI
from dotenv import load_dotenv
from rag.retriever_hybrid import hybrid_retrieve
from utils.clinical_memory import retrieve_similar_experience

# --- CONFIG ---
DEFAULT_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3:14b")
DEFAULT_GITHUB_MODEL = os.getenv("GITHUB_MODEL", "gpt-4o")
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

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
        "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY") or os.getenv("GEMINI_KEY"),
        "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
        "OLLAMA_MODEL": os.getenv("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL),
        "GITHUB_MODEL": os.getenv("GITHUB_MODEL", DEFAULT_GITHUB_MODEL),
        "GEMINI_MODEL": os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL),
        "GROQ_MODEL": os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    }

ENV_KEYS = load_clinical_env()

def _init_groq_client():
    if not ENV_KEYS["GROQ_API_KEY"]:
        return None
    try:
        # Use OpenAI client with Groq base URL
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=ENV_KEYS["GROQ_API_KEY"]
        )
        # Quick check
        client.chat.completions.create(model=ENV_KEYS["GROQ_MODEL"], messages=[{"role": "user", "content": "ping"}], max_tokens=1)
        print(f"[LLM] SUCCESS: Groq ({ENV_KEYS['GROQ_MODEL']}) Active.")
        return client
    except Exception as e:
        print(f"[LLM] Groq check failed: {e}")
        return None

def _init_github_client():
    if not ENV_KEYS["GITHUB_TOKEN"]:
        return None
    try:
        client = OpenAI(base_url="https://models.inference.ai.azure.com", api_key=ENV_KEYS["GITHUB_TOKEN"])
        client.chat.completions.create(model=ENV_KEYS["GITHUB_MODEL"], messages=[{"role": "user", "content": "ping"}], max_tokens=1)
        print(f"[LLM] SUCCESS: GitHub Models ({ENV_KEYS['GITHUB_MODEL']}) Active.")
        return client
    except Exception as e:
        print(f"[LLM] GitHub Models check failed: {e}")
        return None

def _init_ollama_client():
    try:
        ollama.chat(model=ENV_KEYS["OLLAMA_MODEL"], messages=[{'role': 'user', 'content': 'ping'}], options={"num_predict": 1})
        print(f"[LLM] SUCCESS: Ollama ({ENV_KEYS['OLLAMA_MODEL']}) Active.")
        return ollama
    except Exception as e:
        print(f"[LLM] Ollama check failed: {e}")
        return None

def _init_gemini_client():
    if not ENV_KEYS["GEMINI_API_KEY"]:
        return None
    try:
        client = google_genai.Client(api_key=ENV_KEYS["GEMINI_API_KEY"])
        client.models.generate_content(model=ENV_KEYS["GEMINI_MODEL"], contents="ping", config=google_types.GenerateContentConfig(max_output_tokens=1))
        print(f"[LLM] SUCCESS: Gemini ({ENV_KEYS['GEMINI_MODEL']}) Active.")
        return client
    except Exception as e:
        print(f"[LLM] Error initializing Gemini client: {e}")
        return None

def get_llm_provider_and_client():
    # 1. Try Groq (Fastest)
    groq_client = _init_groq_client()
    if groq_client:
        return "groq", groq_client

    # 2. Try Gemini (Fastest Cloud Fallback/Primary)
    gemini_client = _init_gemini_client()
    if gemini_client:
        return "gemini", gemini_client

    # 3. Try GitHub Models
    github_client = _init_github_client()
    if github_client:
        return "github", github_client

    # 4. Fallback to Ollama (Local - Last Resort)
    ollama_client = _init_ollama_client()
    if ollama_client:
        return "ollama", ollama_client

    return None, None

PROVIDER, CLIENT = get_llm_provider_and_client()





# Options for faster local inference
OLLAMA_OPTIONS = {
    "num_predict": 1024,
    "temperature": 0.1,
    "top_p": 0.9,
    "num_ctx": 4096,
}

def generate_treatment_plan(patient, rules, evidence_levels, cancer, query, queries):
    evidence = hybrid_retrieve(cancer, query, queries)
    evidence_text = "\n".join([f"- {e['text']}" for e in evidence])
    rule_summary = json.dumps(rules, indent=2)

    # ─── Case-Based Reasoning Context ───
    historical_experience = ""
    experiences_raw = [] # Return structured objects for the UI
    try:
        patient_dict = patient if isinstance(patient, dict) else {}
        print(f"[MEMORY] Searching for similar cases for {cancer}...")
        past_cases = retrieve_similar_experience(patient_dict, top_k=2)
        if past_cases:
            print(f"[MEMORY] Found {len(past_cases)} similar cases in local index.")
            experiences_raw = past_cases
            historical_experience = "\nINTERNAL HOSPITAL EXPERIENCE (Similar Past Cases):\n"
            for i, case in enumerate(past_cases):
                tx = case['treatment_plan'].get('primary_treatment', 'Standard Care')
                is_corr = "CLINICAL_CORRECTION" in case['text']
                type_str = "[Expert Human Correction]" if is_corr else "[Standard Approval]"
                historical_experience += f"Case {i+1} {type_str}: {tx}. (Similarity: {case['similarity_score']:.2f})\n"
        else:
            print("[MEMORY] No similar cases found in local index.")
    except Exception as e:
        print(f"[MEMORY] Experience retrieval error: {e}")

    prompt = f"""
    Return a structured JSON oncology treatment plan.
    PATIENT: {patient}
    RULES: {rule_summary}
    EVIDENCE: {evidence_text}
    Return ONLY valid JSON with primary_treatment, clinical_rationale, formatted_evidence, alternatives, safety_alerts, follow_up, pathway.
    """

    if not CLIENT: return get_fallback_plan(rules, cancer), evidence, experiences_raw

    try:
        if PROVIDER == "groq":
            print(f"[LLM] Initiating Groq ({ENV_KEYS['GROQ_MODEL']}) request for TREATMENT PLAN...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GROQ_MODEL"], messages=[{"role": "user", "content": prompt}], temperature=0.1, response_format={"type": "json_object"})
            text = response.choices[0].message.content
            print(f"[LLM] Groq Treatment Plan response received ({len(text)} bytes).")
        elif PROVIDER == "github":
            print(f"[LLM] Initiating GitHub ({ENV_KEYS['GITHUB_MODEL']}) request for TREATMENT PLAN...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GITHUB_MODEL"], messages=[{"role": "user", "content": prompt}], temperature=0.1)
            text = response.choices[0].message.content
            print(f"[LLM] GitHub Treatment Plan response received ({len(text)} bytes).")
        elif PROVIDER == "ollama":
            print(f"[LLM] Initiating Ollama ({ENV_KEYS['OLLAMA_MODEL']}) request for TREATMENT PLAN...")
            response = CLIENT.chat(model=ENV_KEYS["OLLAMA_MODEL"], messages=[{"role": "user", "content": prompt}], format='json', options=OLLAMA_OPTIONS)
            text = response['message']['content']
            print(f"[LLM] Ollama Treatment Plan response received ({len(text)} bytes).")
        else: # Gemini
            print(f"[LLM] Initiating Gemini ({ENV_KEYS['GEMINI_MODEL']}) request for TREATMENT PLAN...")
            response = CLIENT.models.generate_content(model=ENV_KEYS["GEMINI_MODEL"], contents=prompt, config=google_types.GenerateContentConfig(temperature=0.1))
            text = response.text
            print(f"[LLM] Gemini Treatment Plan response received ({len(text)} bytes).")

        json_match = re.search(r'\{.*\}', text.strip(), re.DOTALL)
        if json_match: return json.loads(json_match.group(0)), evidence, experiences_raw
        raise ValueError("JSON parsing failed")
    except Exception as e:
        print(f"[LLM ERROR] Plan failed: {e}")
        return get_fallback_plan(rules, cancer), evidence, experiences_raw

def get_fallback_plan(rules, cancer):
    primary_list = rules.get("primary_treatments", [])
    primary = primary_list[0] if primary_list else "Standard Protocol"
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

    # ─── New: Case-Based Reasoning for Outcomes ───
    
    if not CLIENT: return get_fallback_outcomes(patient_data_dict), evidence

    prompt = f"Predict outcomes for {patient}. Evidence: {evidence_text}. Return JSON."

    try:
        if PROVIDER == "groq":
            print(f"[LLM] Initiating Groq ({ENV_KEYS['GROQ_MODEL']}) request for OUTCOMES...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GROQ_MODEL"], messages=[{"role": "user", "content": prompt}], response_format={"type": "json_object"})
            text = response.choices[0].message.content
            print(f"[LLM] Groq Outcomes response received ({len(text)} bytes).")
        elif PROVIDER == "github":
            print(f"[LLM] Initiating GitHub ({ENV_KEYS['GITHUB_MODEL']}) request for OUTCOMES...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GITHUB_MODEL"], messages=[{"role": "user", "content": prompt}])
            text = response.choices[0].message.content
            print(f"[LLM] GitHub Outcomes response received ({len(text)} bytes).")
        elif PROVIDER == "ollama":
            print(f"[LLM] Initiating Ollama ({ENV_KEYS['OLLAMA_MODEL']}) request for OUTCOMES...")
            response = CLIENT.chat(model=ENV_KEYS["OLLAMA_MODEL"], messages=[{"role": "user", "content": prompt}], format='json', options=OLLAMA_OPTIONS)
            text = response['message']['content']
            print(f"[LLM] Ollama Outcomes response received ({len(text)} bytes).")
        else: # Gemini
            print(f"[LLM] Initiating Gemini ({ENV_KEYS['GEMINI_MODEL']}) request for OUTCOMES...")
            response = CLIENT.models.generate_content(model=ENV_KEYS["GEMINI_MODEL"], contents=prompt)
            text = response.text
            print(f"[LLM] Gemini Outcomes response received ({len(text)} bytes).")

        json_match = re.search(r'\{.*\}', text.strip(), re.DOTALL)
        if json_match: return json.loads(json_match.group(0)), evidence
        raise ValueError("No JSON")
    except Exception as e:
        print(f"[LLM ERROR] Outcomes prediction failed: {e}")
        return get_fallback_outcomes(patient_data_dict), evidence

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

def format_evidence_llm(evidence_list):
    if not evidence_list or not CLIENT:
        return "No specific evidence or LLM client available for formatting."

    all_evidence_text = "\n\n---\n\n".join([f"- {e['text']}" for e in evidence_list])

    prompt = f"""
        You are a clinical assistant AI. Your task is to synthesize and format medical evidence into a clear, concise summary for an oncologist.
        
        CRITICAL INSTRUCTIONS:
        - Provide ONLY the formatted clinical synthesis.
        - DO NOT include any greetings, introductions, or closing statements.
        - DO NOT include any generic supportive language.
        - Start directly with the evidence synthesis.

        The following is a list of evidence snippets from various sources (e.g., NCCN guidelines, clinical trial results).
        Please format this information into a structured summary. Use markdown for formatting, such as bolding for headers and bullet points for lists.

        Do not simply list the evidence. Synthesize it. Group related findings, highlight key takeaways, and present it in a logical order.

        Here is the evidence to format:
        {all_evidence_text}
    """

    try:
        if PROVIDER == "groq":
            print(f"[LLM] Initiating Groq ({ENV_KEYS['GROQ_MODEL']}) request for EVIDENCE FORMATTING...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GROQ_MODEL"], messages=[{"role": "user", "content": prompt}], temperature=0.1)
            text = response.choices[0].message.content
            print(f"[LLM] Groq Evidence Formatting response received ({len(text)} bytes).")
        elif PROVIDER == "github":
            print(f"[LLM] Initiating GitHub ({ENV_KEYS['GITHUB_MODEL']}) request for EVIDENCE FORMATTING...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GITHUB_MODEL"], messages=[{"role": "user", "content": prompt}], temperature=0.1)
            text = response.choices[0].message.content
            print(f"[LLM] GitHub Evidence Formatting response received ({len(text)} bytes).")
        elif PROVIDER == "ollama":
            print(f"[LLM] Initiating Ollama ({ENV_KEYS['OLLAMA_MODEL']}) request for EVIDENCE FORMATTING...")
            response = CLIENT.chat(model=ENV_KEYS["OLLAMA_MODEL"], messages=[{"role": "user", "content": prompt}], format='json', options=OLLAMA_OPTIONS)
            text = response['message']['content']
            print(f"[LLM] Ollama Evidence Formatting response received ({len(text)} bytes).")
        else: # Gemini
            print(f"[LLM] Initiating Gemini ({ENV_KEYS['GEMINI_MODEL']}) request for EVIDENCE FORMATTING...")
            response = CLIENT.models.generate_content(model=ENV_KEYS["GEMINI_MODEL"], contents=prompt, config=google_types.GenerateContentConfig(temperature=0.1))
            text = response.text
            print(f"[LLM] Gemini Evidence Formatting response received ({len(text)} bytes).")
        
        return text.strip()
    except Exception as e:
        print(f"[LLM ERROR] Evidence formatting failed: {e}")
        # Fallback to simple formatting if LLM fails
        return "**Clinical Evidence Summary (Fallback)**\n\n" + "\n\n---\n\n".join([f"- {e['text']}" for e in evidence_list])

def format_pathway_llm(plan):
    if not plan or not CLIENT:
        return [] # Return empty list if no plan or LLM client

    recommended_protocol = plan.get('recommendedProtocol', 'Standard Protocol')
    rationale = plan.get('rationale', 'No rationale provided.')
    alternatives = ", ".join([alt.get('option', '') if isinstance(alt, dict) else alt for alt in plan.get('alternativeOptions', [])])

    prompt = f"""
    You are an AI clinical pathway generator. Create a detailed 12-week timeline for:
    Protocol: {recommended_protocol}
    Rationale: {rationale}
    Alternatives: {alternatives}

    Output ONLY a JSON array of objects with keys: "title", "duration", "description", "details" (string array), "marker" (emoji).
    Weeks 1 to 12.
    """

    try:
        if PROVIDER == "groq":
            print(f"[LLM] Initiating Groq ({ENV_KEYS['GROQ_MODEL']}) request for PATHWAY GENERATION...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GROQ_MODEL"], messages=[{"role": "user", "content": prompt}], temperature=0.1, response_format={"type": "json_object"})
            text = response.choices[0].message.content
            print(f"[LLM] Groq Pathway Generation response received ({len(text)} bytes).")
        elif PROVIDER == "github":
            print(f"[LLM] Initiating GitHub ({ENV_KEYS['GITHUB_MODEL']}) request for PATHWAY GENERATION...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GITHUB_MODEL"], messages=[{"role": "user", "content": prompt}], temperature=0.1)
            text = response.choices[0].message.content
            print(f"[LLM] GitHub Pathway Generation response received ({len(text)} bytes).")
        elif PROVIDER == "ollama":
            print(f"[LLM] Initiating Ollama ({ENV_KEYS['OLLAMA_MODEL']}) request for PATHWAY GENERATION...")
            response = CLIENT.chat(model=ENV_KEYS["OLLAMA_MODEL"], messages=[{"role": "user", "content": prompt}], format='json', options=OLLAMA_OPTIONS)
            text = response['message']['content']
            print(f"[LLM] Ollama Pathway Generation response received ({len(text)} bytes).")
        else: # Gemini
            print(f"[LLM] Initiating Gemini ({ENV_KEYS['GEMINI_MODEL']}) request for PATHWAY GENERATION...")
            response = CLIENT.models.generate_content(model=ENV_KEYS["GEMINI_MODEL"], contents=prompt, config=google_types.GenerateContentConfig(temperature=0.1))
            text = response.text
            print(f"[LLM] Gemini Pathway Generation response received ({len(text)} bytes).")
        
        # Extract JSON from response
        json_match = re.search(r'\[\s*\{.*\}\s*\]', text.strip(), re.DOTALL)
        if json_match:
            return json.loads(json_match.group(0))
        raise ValueError("JSON array parsing failed for pathway.")
    except Exception as e:
        print(f"[LLM ERROR] Pathway generation failed: {e}")
        return [] # Fallback to empty list


def query_treatment_plan(patient, plan, query, cancer, history=None):
    """
    NEURO-SYMBOLIC CHATBOT: 
    Uses LLM to extract deltas, re-runs rule engine for deterministic clinical logic.
    """
    from rule_engine import run_rules # Local import to avoid circular dependency
    from utils.formatter import format_multimodal_data
    
    # 1. Ask LLM if the user is proposing a change to the patient's data (with fallback)
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
        if PROVIDER == "groq":
            print(f"[LLM] Initiating Groq ({ENV_KEYS['GROQ_MODEL']}) request for CLINICAL DELTA extraction...")
            resp = CLIENT.chat.completions.create(model=ENV_KEYS["GROQ_MODEL"], messages=[{"role": "user", "content": extraction_prompt}], response_format={"type": "json_object"})
            clinical_delta = json.loads(resp.choices[0].message.content)
            print(f"[LLM] Groq Clinical Delta received: {clinical_delta.get('change')}")
        elif PROVIDER == "github":
            print(f"[LLM] Initiating GitHub ({ENV_KEYS['GITHUB_MODEL']}) request for CLINICAL DELTA extraction...")
            resp = CLIENT.chat.completions.create(model=ENV_KEYS["GITHUB_MODEL"], messages=[{"role": "user", "content": extraction_prompt}], response_format={"type": "json_object"})
            clinical_delta = json.loads(resp.choices[0].message.content)
            print(f"[LLM] GitHub Clinical Delta received: {clinical_delta.get('change')}")
        elif PROVIDER == "ollama":
            print(f"[LLM] Initiating Ollama ({ENV_KEYS['OLLAMA_MODEL']}) request for CLINICAL DELTA extraction...")
            resp = CLIENT.chat(model=ENV_KEYS["OLLAMA_MODEL"], messages=[{"role": "user", "content": extraction_prompt}], format='json', options=OLLAMA_OPTIONS)
            clinical_delta = json.loads(resp['message']['content'])
            print(f"[LLM] Ollama Clinical Delta received: {clinical_delta.get('change')}")
        else: # Gemini
            print(f"[LLM] Initiating Gemini ({ENV_KEYS['GEMINI_MODEL']}) request for CLINICAL DELTA extraction...")
            resp = CLIENT.models.generate_content(model=ENV_KEYS["GEMINI_MODEL"], contents=extraction_prompt)
            match = re.search(r'\{.*\}', resp.text, re.DOTALL)
            if match: clinical_delta = json.loads(match.group(0))
            print(f"[LLM] Gemini Clinical Delta received: {clinical_delta.get('change')}")
    except Exception as e:
        print(f"[LLM ERROR] Clinical delta extraction failed: {e}")
        pass


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

    # 3. Final Answer Generation (with fallback)
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
    
    If the query is a "What-if" simulation (e.g., "What if we switch to X at month Y?"), provide a structured analysis:
    ### WHAT-IF SIMULATION: [SCENARIO NAME]
    1. CLINICAL RATIONALE: Why this shift might be considered.
    2. PROJECTED OUTCOME DELTA: How survival (OS/PFS) or Response Indicator might shift.
    3. TOXICITY SHIFT: New side effects to monitor.
    4. PATHWAY ADJUSTMENT: How the remaining timeline phases would change.

    Otherwise, follow these guidelines:
    1. HEADER: Identify the factor (### [FACTOR] IMPACT ANALYSIS).
    2. DELTA: Explain exactly how rule-engine results changed.
    3. ACTIONS: 3-4 clinical bullet points.
    4. SYSTEMIC: Changes to Chemo/RT.
    5. SAFETY: New contraindications.

    PATIENT CONTEXT (Summarized):
    {multimodal_summary}
    
    CORE CLINICAL PROFILE:
    {json.dumps(pruned_patient, indent=2)}

    CURRENT PLAN/SCENARIOS: {str(plan)}
    QUERY: {query}
    
    CONSULTANT RESPONSE:
    """
    
    try:
        if PROVIDER == "groq":
            print(f"[LLM] Initiating Groq ({ENV_KEYS['GROQ_MODEL']}) request for CONSULTANT RESPONSE...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GROQ_MODEL"], messages=[{"role": "user", "content": final_prompt}])
            result = response.choices[0].message.content.strip()
            print(f"[LLM] Groq Consultant Response received ({len(result)} bytes).")
            return result, []
        elif PROVIDER == "github":
            print(f"[LLM] Initiating GitHub ({ENV_KEYS['GITHUB_MODEL']}) request for CONSULTANT RESPONSE...")
            response = CLIENT.chat.completions.create(model=ENV_KEYS["GITHUB_MODEL"], messages=[{"role": "user", "content": final_prompt}])
            result = response.choices[0].message.content.strip()
            print(f"[LLM] GitHub Consultant Response received ({len(result)} bytes).")
            return result, []
        elif PROVIDER == "ollama":
            print(f"[LLM] Initiating Ollama ({ENV_KEYS['OLLAMA_MODEL']}) request for CONSULTANT RESPONSE...")
            response = CLIENT.chat(model=ENV_KEYS["OLLAMA_MODEL"], messages=[{"role": "user", "content": final_prompt}], options=OLLAMA_OPTIONS)
            result = response['message']['content'].strip()
            print(f"[LLM] Ollama Consultant Response received ({len(result)} bytes).")
            return result, []
        else: # Gemini
            print(f"[LLM] Initiating Gemini ({ENV_KEYS['GEMINI_MODEL']}) request for CONSULTANT RESPONSE...")
            response = CLIENT.models.generate_content(model=ENV_KEYS["GEMINI_MODEL"], contents=final_prompt)
            return response.text.strip(), []
    except Exception as e:
        print(f"[LLM ERROR] Final answer generation failed: {e}")
        return "The reasoning engine encountered an error.", []
