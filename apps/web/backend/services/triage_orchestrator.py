from api.schemas.models import PatientIntake, TriageResponse
import os
import json
import requests
from services.xray_service import analyze_xray
from services.retrieval_service import retrieve_context

def run_triage(data: PatientIntake) -> TriageResponse:
    # 1. Retrieve guidance
    query = f"{data.symptoms} {data.medical_history}"
    print(f"🔍 Searching local medical protocols for: {data.symptoms[:50]}...")
    retrieved_guidance = retrieve_context(query)
    
    # 2. Load system prompt:
    prompt_path = os.path.join(os.path.dirname(__file__), "../../../../core/prompts/system_prompt.txt")
    with open(prompt_path, "r", encoding="utf-8") as f: 
        system_prompt = f.read()

    # If X-Ray image exists, run vision extraction first:
    extracted_xray = data.xray_findings or 'N/A'
    if data.xray_image_b64:
        print("X-Ray image detected, sending to offline vision model...")
        extracted_xray = analyze_xray(data.xray_image_b64)

    # 3. Format input variables and Run Gemma 4
    patient_text = (
        f"Age: {data.age}, Sex: {data.sex}\n"
        f"Symptoms: {data.symptoms}\n"
        f"Duration: {data.duration}\n"
        f"Vitals: {data.vitals.dict() if data.vitals else 'N/A'}\n"
        f"Medical History: {data.medical_history}\n"
        f"Imaging Findings: {extracted_xray}\n\n"
        f"--- RELEVANT CLINICAL PROTOCOLS ---\n"
        f"{retrieved_guidance}"
    )
                   
    full_prompt = f"{system_prompt}\n\nPatient Intake Data:\n{patient_text}"

    url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
    try:
        model_name = os.environ.get("TRIAGE_MODEL", "gemma4:e2b")
        payload = {
            "model": model_name,
            "prompt": full_prompt,
            "stream": False,
            "format": "json"
        }
        res = requests.post(url, json=payload, timeout=60)
        res.raise_for_status()
        raw_output = res.json().get("response", "")
        parsed = json.loads(raw_output)
        
        # --- NEW: SAFETY GUARDRAIL LOOP ---
        print("🛡️ Running AI Safety Audit...")
        guardrail_path = os.path.join(os.path.dirname(__file__), "../../../../core/prompts/safety_guardrail_prompt.txt")
        with open(guardrail_path, "r", encoding="utf-8") as f:
            guardrail_template = f.read()
            
        audit_prompt = guardrail_template.format(
            retrieved_guidance=retrieved_guidance,
            patient_text=patient_text,
            draft_triage=raw_output
        )
        
        audit_payload = {
            "model": model_name,
            "prompt": audit_prompt,
            "stream": False,
            "format": "json"
        }
        audit_res = requests.post(url, json=audit_payload, timeout=60)
        audit_res.raise_for_status()
        audit_parsed = json.loads(audit_res.json().get("response", "{}"))
        
        # Self-Correction: Force higher urgency if auditor requires it
        final_urgency = parsed.get("urgency_level", "UNKNOWN")
        if audit_parsed.get("safety_status") == "CORRECTION_REQUIRED":
            print(f"⚠️ Safety Audit triggered correction: {final_urgency} -> {audit_parsed.get('suggested_urgency')}")
            final_urgency = audit_parsed.get("suggested_urgency", final_urgency)
            
        return TriageResponse(
            urgency_level=final_urgency,
            likely_concerns=parsed.get("likely_concerns", []),
            immediate_next_steps=list(set(parsed.get("immediate_next_steps", []) + audit_parsed.get("missing_steps", []))),
            suggested_medications=parsed.get("suggested_medications", []),
            suggested_questions=parsed.get("suggested_questions", []),
            escalation_triggers=parsed.get("escalation_triggers", []),
            patient_explanation=parsed.get("patient_explanation", "Analysis complete."),
            clinician_summary=parsed.get("clinician_summary", "Review attached automated findings."),
            terminology_explained=parsed.get("terminology_explained", {}),
            safety_audit=audit_parsed.get("audit_notes", "Safety check completed successfully.")
        )
    except Exception as e:
        print(f"Ollama inference failed: {e}")
        # Fallback Mock Response on failure
        return TriageResponse(
            urgency_level="YELLOW" if data.vitals and data.vitals.spo2 and data.vitals.spo2 > 90 else "RED",
            likely_concerns=["Ollama connection failed", "System Mock Fallback active"],
            immediate_next_steps=[f"Ensure Ollama is running (`ollama run gemma`)", "Consult physician"],
            escalation_triggers=["Model disconnected"],
            patient_explanation="Our AI server is currently offline. Returning standard guidelines. Please see a doctor.",
            clinician_summary=f"Error connecting to local LLM: {str(e)}"
        )