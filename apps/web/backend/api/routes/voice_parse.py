from fastapi import APIRouter
from pydantic import BaseModel
import os
import json
import requests

router = APIRouter()

class VoiceParseRequest(BaseModel):
    transcript: str

PARSE_PROMPT_TEMPLATE = """You are an emergency medical AI assistant in a multilingual disaster response setting.
A healthcare worker just described a patient verbally. The transcript may be in English, Hindi, Punjabi, Bengali, Tamil, or any other language.
Your job is to extract the structured patient information into English JSON.

Return ONLY valid JSON. If a field is unknown or not mentioned, use null.

JSON keys:
- age (string, e.g. "42")
- sex ("M" / "F" / null)
- symptoms (string, describe the main complaint in English)
- duration (string, how long since symptoms started, e.g. "2 hours")
- medicalHistory (string, past conditions and surgical history)
- chronic_diseases (string, e.g. "Diabetes, Hypertension")
- current_medications (string, medications the patient is taking)
- mechanism_of_injury (string: "fall", "burn", "accident", "blast", "assault", etc.)
- injury_sites (string, comma-separated body parts, e.g. "left leg, chest")
- consciousness_avpu (string: "Alert", "Voice", "Pain", or "Unresponsive")
- active_bleeding (string: "yes" or "no")
- burn_bsa (string, estimated body surface area burned, e.g. "15%")
- vitals_temp (string, body temperature in Celsius, e.g. "37.5")
- vitals_spo2 (string, oxygen saturation percentage, e.g. "96")
- vitals_hr (string, heart rate in bpm, e.g. "88")

Transcript:
"{transcript}"

Output only the JSON object with no markdown, no code blocks, no extra text:
"""


@router.post("/voice-parse")
def parse_voice_intake(req: VoiceParseRequest):
    url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
    model_name = os.environ.get("TRIAGE_MODEL", "gemma4:e2b")

    prompt = PARSE_PROMPT_TEMPLATE.replace("{transcript}", req.transcript)
    print(f"\n[VoiceParse] Using model: {model_name}")
    print(f"[VoiceParse] Parsing transcript: {req.transcript[:120]}...")

    try:
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        res = requests.post(url, json=payload, timeout=60)
        res.raise_for_status()
        raw_output = res.json().get("response", "").strip()

        # Robust JSON cleaning: handle cases where model adds markdown blocks
        if "```" in raw_output:
            raw_output = raw_output.split("```")[1]
            if raw_output.startswith("json"):
                raw_output = raw_output[4:].strip()

        print(f"[VoiceParse] AI Response: {raw_output}")
        parsed = json.loads(raw_output)

        # Normalize: strip whitespace from all string values, filter out nulls
        cleaned = {
            k: (v.strip() if isinstance(v, str) else v)
            for k, v in parsed.items()
            if v is not None and v != ""
        }
        print(f"[VoiceParse] ✅ Extracted {len(cleaned)} fields successfully.")
        return {"success": True, "fields": cleaned}

    except json.JSONDecodeError as e:
        print(f"[VoiceParse] JSON Decode Error: {e} | Raw: {raw_output}")
        return {"success": False, "fields": {}, "error": f"AI returned invalid JSON: {str(e)}"}
    except Exception as e:
        print(f"[VoiceParse] Error: {e}")
        return {"success": False, "fields": {}, "error": str(e)}
