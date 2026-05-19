from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Union
import os
import requests
import json

router = APIRouter()

class TranslateRequest(BaseModel):
    text: Optional[str] = None          # single string translation
    items: Optional[List[str]] = None   # list of strings (concerns, next steps)
    target_lang: str

from fastapi.responses import StreamingResponse

def _call_ollama(prompt: str, timeout: int = 60) -> str:
    url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
    payload = {
        "model": "gemma4:latest", 
        "messages": [{"role": "user", "content": prompt}], 
        "stream": False
    }
    res = requests.post(url, json=payload, timeout=timeout)
    res.raise_for_status()
    return res.json().get("message", {}).get("content", "").strip()

@router.post("/translate/stream")
def translate_stream(req: TranslateRequest):
    prompt = (
        f"Translate the following text into plain {req.target_lang}. "
        f"Maintain the exact same formatting, line breaks, and list numbering. "
        f"Output ONLY the translation, no conversational fillers or explanations:\n\n{req.text}"
    )
    url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/chat")
    payload = {
        "model": "gemma4:latest",
        "messages": [{"role": "user", "content": prompt}],
        "stream": True
    }
    
    def generate():
        try:
            with requests.post(url, json=payload, stream=True, timeout=60) as res:
                res.raise_for_status()
                for line in res.iter_lines():
                    if line:
                        data = json.loads(line)
                        if "message" in data and "content" in data["message"]:
                            yield data["message"]["content"]
        except Exception as e:
            yield f"\n[Translation error: {str(e)}]"

    return StreamingResponse(generate(), media_type="text/plain")


@router.post("/translate")
def translate_text(req: TranslateRequest):
    """
    Translates either a single text string OR a list of strings into the target language.
    Returns: { translated_text: str } OR { translated_items: [str] }
    """
    try:
        # ── List translation (concerns, next steps) ──────────────────
        if req.items is not None:
            numbered = "\n".join(f"{i+1}. {item}" for i, item in enumerate(req.items))
            prompt = (
                f"Translate each of the following numbered medical items into {req.target_lang}. "
                f"Keep the medical meaning accurate. Return ONLY the numbered list in the same format, no extra text:\n\n"
                f"{numbered}"
            )
            raw = _call_ollama(prompt)
            # Parse numbered lines back to a list
            translated_items = []
            for ln in raw.splitlines():
                ln = ln.strip()
                # Strip markdown, bolding, etc. if present, but we just need to check if it starts with a number.
                # E.g., "1. Term" or "**1.** Term"
                clean_ln = ln.replace("**", "").strip()
                if clean_ln and clean_ln[0].isdigit() and '.' in clean_ln[:3]:
                    translated_items.append(clean_ln.split('.', 1)[1].strip())
                    
            # Pad/trim to match original length
            while len(translated_items) < len(req.items):
                translated_items.append(req.items[len(translated_items)])
            return {"translated_items": translated_items[:len(req.items)]}

        # ── Single text translation ───────────────────────────────────
        if req.text is not None:
            prompt = (
                f"Translate the following medical explanation into plain {req.target_lang}. "
                f"Keep it simple and comforting. Output ONLY the translation, no commentary:\n\n{req.text}"
            )
            translated = _call_ollama(prompt)
            return {"translated_text": translated}

        return {"error": "Provide either 'text' or 'items' in the request body."}

    except Exception as e:
        print(f"Translation failed: {e}")
        if req.items is not None:
            return {"translated_items": req.items}  # fallback: return originals
        return {"translated_text": f"[{req.target_lang} translation unavailable] {req.text or ''}"}