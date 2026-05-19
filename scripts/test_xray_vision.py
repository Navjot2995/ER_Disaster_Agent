"""
Quick diagnostic: tests if the running Ollama model supports image inputs.
Run from the project root: python scripts/test_xray_vision.py
"""
import requests
import base64
import os
import json

# Tiny 1x1 white pixel PNG as a test image
TEST_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

OLLAMA_URL = "http://localhost:11434"

def list_models():
    """Lists all models currently available in Ollama."""
    res = requests.get(f"{OLLAMA_URL}/api/tags", timeout=10)
    models = res.json().get("models", [])
    print("\n📦 Available Ollama models:")
    for m in models:
        print(f"  - {m['name']}")
    return [m['name'] for m in models]

def test_vision(model_name: str):
    """Tests if a model can accept image inputs."""
    print(f"\n🔬 Testing vision on model: {model_name}")
    payload = {
        "model": model_name,
        "prompt": "What color is the main object in this image? Reply in 5 words or less.",
        "images": [TEST_IMAGE_B64],
        "stream": False
    }
    try:
        res = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=60)
        if res.status_code == 200:
            response = res.json().get("response", "").strip()
            print(f"  ✅ Vision WORKS! Response: '{response}'")
            return True
        else:
            print(f"  ❌ Error {res.status_code}: {res.text[:200]}")
            return False
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("ER Gemma Vision — X-Ray Diagnostic Test")
    print("=" * 50)

    available = list_models()

    # Test the current VISION_MODEL setting
    current_model = os.environ.get("VISION_MODEL", "gemma4:e2b")
    test_vision(current_model)

    # Also test moondream as a known-good fallback
    if "moondream:latest" in available or "moondream" in available:
        test_vision("moondream")
    else:
        print("\n⚠️  moondream not found. Run: ollama pull moondream")

    print("\n" + "=" * 50)
    print("Recommendation:")
    print("If gemma4:e2b fails vision, set VISION_MODEL=moondream in your environment.")
    print("=" * 50)
