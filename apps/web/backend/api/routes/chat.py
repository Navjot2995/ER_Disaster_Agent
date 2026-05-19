from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import os
import requests

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]
    patient_context: Dict[str, Any]
    triage_context: Dict[str, Any]

CHAT_SYSTEM_PROMPT = """You are an emergency medical AI assistant. You have just provided a triage diagnosis for a patient.
The clinician is now asking you follow-up questions about this specific patient.

Here is the patient's data:
{patient_data}

Here is your initial triage result:
{triage_result}

Answer the clinician's questions concisely and accurately based ONLY on the provided context and standard emergency medicine protocols.
If they ask for medication dosages or treatments, provide standard guidelines but ALWAYS include a disclaimer that this is clinical decision support and requires physician verification.
"""

from fastapi.responses import StreamingResponse
import json

@router.post("/chat")
def chat_with_gemma(req: ChatRequest):
    url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
    model_name = os.environ.get("TRIAGE_MODEL", "gemma4:latest")
    
    patient_str = "\n".join([f"{k}: {v}" for k, v in req.patient_context.items() if v])
    triage_str = "\n".join([f"{k}: {v}" for k, v in req.triage_context.items() if v])
    
    system_prompt = CHAT_SYSTEM_PROMPT.format(patient_data=patient_str, triage_result=triage_str)
    
    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": req.message})
    
    def generate():
        payload = {
            "model": model_name,
            "messages": messages,
            "stream": True
        }
        try:
            with requests.post(url, json=payload, stream=True, timeout=60) as res:
                res.raise_for_status()
                for line in res.iter_lines():
                    if line:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
        except Exception as e:
            print(f"[Chat Stream] Error: {e}")
            yield f"\n[Error: {str(e)}]"

    return StreamingResponse(generate(), media_type="text/plain")
