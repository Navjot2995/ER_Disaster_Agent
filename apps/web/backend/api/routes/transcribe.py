from fastapi import APIRouter, UploadFile, File, Form
from services.whisper_service import transcribe_audio
from typing import Optional

router = APIRouter()

@router.post("/transcribe")
async def transcribe_endpoint(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None)
):
    """
    Accepts an audio file (webm/ogg/wav/mp4) from the browser MediaRecorder.
    Returns the Whisper transcript as plain text.
    language: ISO-639-1 code ('hi', 'es', 'fr', 'en' ...) or omit for auto-detect.
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        return {"transcript": "", "error": "Empty audio file received"}

    try:
        transcript = transcribe_audio(audio_bytes, language=language or None)
        return {"transcript": transcript, "language_hint": language}
    except Exception as e:
        print(f"[Transcribe] Error: {e}")
        return {"transcript": "", "error": str(e)}
