import urllib.request
import json
import time

url = "http://localhost:11434/api/generate"
data = json.dumps({
    "model": "gemma4:latest",
    "prompt": "Respond with 'SUCCESS: Gemma is active!'",
    "stream": False
}).encode('utf-8')

print("Pinging local Ollama server (gemma4:latest)...")
start_time = time.time()
try:
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as response:
        res = json.loads(response.read().decode('utf-8'))
        response_text = res.get("response", "").strip()
        elapsed = time.time() - start_time
        print(f"\n✅ Connection Successful! (Response time: {elapsed:.2f}s)")
        print(f"🤖 Gemma says: {response_text}")
except Exception as e:
    print(f"\n❌ Error: {e}")
    print("Make sure 'ollama run gemma4:latest' is active in another window.")
