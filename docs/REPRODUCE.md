# Reproduction Guide: ER Gemma Vision

This guide provides the exact steps required to reproduce the **ER Gemma Vision** system for the *Gemma 4 Good Hackathon*. This project is designed to run entirely offline on consumer-grade hardware.

## 💻 Hardware Requirements
- **OS**: Windows 10/11, macOS, or Linux.
- **RAM**: Minimum 16GB (32GB recommended for simultaneous Whisper + Gemma + Vision).
- **GPU**: NVIDIA GPU (8GB+ VRAM) is recommended for speed, but the system supports CPU-only execution via Ollama and `faster-whisper` (int8).

## 🛠️ Prerequisites
1. **Ollama**: [Download and install Ollama](https://ollama.com/).
2. **Node.js**: v18 or higher.
3. **Python**: 3.10 or higher.
4. **FFmpeg**: Required for audio processing (Whisper).

## 🚀 Setup Instructions

### 1. Model Preparation (Ollama)
Ensure the local models are pulled and available. Open a terminal and run:
```powershell
ollama pull gemma4:e2b
ollama pull moondream
```

### 2. Backend Setup
Navigate to the backend directory and install dependencies:
```powershell
cd apps/web/backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup
Navigate to the frontend directory and install dependencies:
```powershell
cd apps/web/frontend
npm install
```

## 🏃 Running the Application

### Option A: Automatic Startup (Windows)
Run the provided PowerShell script from the root directory:
```powershell
.\scripts\run_dev.ps1
```

### Option B: Manual Startup
**Terminal 1 (Backend):**
```powershell
cd apps/web/backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 (Frontend):**
```powershell
cd apps/web/frontend
npm run dev
```

## 🧪 Verification Steps
1. **Access the UI**: Open `http://localhost:5173` in your browser.
2. **Test Voice Intake**: Click "Start Voice Intake" and describe a patient (e.g., "65-year-old male with sharp chest pain").
3. **Test X-Ray Scanning**: Upload a chest X-ray image in the "Imaging" section.
4. **Submit**: Click "Analyze with Gemma 4".
5. **Expected Output**: The system should return a JSON-structured triage response including "Likely Concerns" and "AI Extracted Findings" from the X-ray.

## 📂 Project Structure for Review
- `core/prompts/`: Contains the grounding system prompts.
- `apps/web/backend/services/`: Core logic for Triage, X-ray, and Voice processing.
- `data/emergency_guides/`: Offline RAG knowledge base.
