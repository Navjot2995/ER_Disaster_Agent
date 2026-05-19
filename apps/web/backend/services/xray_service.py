import requests
import os

def analyze_xray(b64_string: str) -> str:
    """
    Sends the base64 X-ray image to Gemma 4 (native multimodal) via Ollama
    for radiology analysis. Gemma 4 is preferred over moondream because it
    has stronger medical reasoning and is already used for triage — keeping
    the system single-model and simpler to reproduce.

    Falls back to VISION_MODEL env var (default: moondream) if overridden.
    """
    url = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")

    prompt = (
        "You are an expert emergency radiologist. Analyze this medical image (X-Ray or CT scan). "
        "First, identify the modality and body part (e.g., Chest X-Ray, Head CT, Bone X-Ray). "
        "Then, extract key medical findings. "
        "- For chest images: look for opacities, pleural effusions, pneumothorax. "
        "- For head CTs: look for intracranial hemorrhage, midline shift, mass effect, or infarcts. "
        "- For bone images: look for fractures or dislocations. "
        "Keep the analysis brief and objective (under 40 words). If the image appears normal, say 'No acute findings.'"
    )

    # gemma4:latest (9.6GB) is the full multimodal version with native vision support.
    # gemma4:e2b is text-only. Do NOT use e2b for image analysis.
    model_name = os.environ.get("VISION_MODEL", "gemma4:latest")

    print(f"[XRay] Sending image to vision model: {model_name}")

    try:
        payload = {
            "model": model_name,
            "prompt": prompt,
            "images": [b64_string],
            "stream": False
        }
        # Generous timeout — Gemma 4 may take up to 2 minutes on CPU for vision
        res = requests.post(url, json=payload, timeout=120)

        if res.status_code == 404:
            return (
                f"Error: Model '{model_name}' not found. "
                f"Please run 'ollama pull {model_name}' or set VISION_MODEL=moondream."
            )

        if not res.ok:
            error_body = res.text[:300]
            print(f"[XRay] ❌ HTTP {res.status_code} from Ollama: {error_body}")
            return f"Vision model error ({res.status_code}): {error_body}"

        res.raise_for_status()
        findings = res.json().get("response", "").strip()
        print(f"[XRay] ✅ Findings: {findings[:80]}...")
        return f"AI Extracted Findings: {findings}"

    except requests.exceptions.Timeout:
        return "X-ray analysis timed out. Try setting VISION_MODEL=moondream for faster results."
    except Exception as e:
        print(f"[XRay] ❌ Exception: {type(e).__name__}: {e}")
        return f"Vision analysis failed: {str(e)}. Ensure Ollama is running."
