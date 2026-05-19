"""
Whisper STT service — loads the medium model once as a singleton.
Fully offline after first download (~1.5 GB, cached by HuggingFace).
Supports 99+ languages including Hindi, Bengali, Punjabi, Tamil, and more.
"""
from faster_whisper import WhisperModel
import tempfile
import os

_model = None

def get_model() -> WhisperModel:
    global _model
    if _model is None:
        print("[Whisper] Loading medium model (first load may take a moment)...")
        _model = WhisperModel(
            "medium",
            device="cpu",
            compute_type="int8",   # quantized — faster & less RAM on CPU
        )
        print("[Whisper] ✅ Model loaded. Supports 99+ languages offline.")
    return _model


def transcribe_audio(audio_bytes: bytes, language: str | None = None) -> str:
    """
    Accepts raw audio bytes (any format ffmpeg can decode: webm, ogg, mp4, wav…),
    runs Whisper, returns the full transcript as a plain string.

    language: ISO-639-1 code ('hi', 'bn', 'pa', 'ta', 'te', 'ur', 'es', 'fr'...)
              or None for auto-detect.
    """
    model = get_model()

    # Write to a temp file — faster-whisper needs a file path
    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        kwargs = dict(
            beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 500}
        )
        if language:
            kwargs["language"] = language
            print(f"[Whisper] Language hint provided: '{language}'")
        else:
            print("[Whisper] No language hint — auto-detecting...")

        segments, info = model.transcribe(tmp_path, **kwargs)
        transcript = " ".join(seg.text.strip() for seg in segments).strip()

        print(f"[Whisper] ✅ Detected language: {info.language} ({info.language_probability:.0%} confidence)")
        print(f"[Whisper] Transcript: {transcript[:100]}...")
        return transcript
    finally:
        os.unlink(tmp_path)
