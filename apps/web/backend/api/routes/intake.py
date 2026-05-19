from fastapi import APIRouter

router = APIRouter()

@router.post("/voice-intake")
def voice_intake(text: str):
    # Mocking transcription and field extraction
    return {"transcript": text, "extracted_fields": {}}