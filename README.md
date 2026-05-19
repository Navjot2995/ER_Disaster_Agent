# ER Gemma Vision
A local-first multimodal triage assistant using Gemma 4 for low-connectivity clinics.

## Overview
ER Gemma Vision is a clinical decision support prototype designed to assist in emergency settings by combining patient symptoms, vitals, medical history, optional voice input, and chest X-rays. It uses Gemma 4 to provide grounded, safe triage support.

**Disclaimer**: This is a prototype and not a definitive diagnostic tool.

## Setup Instructions
1. Clone the repository
2. Backend: `cd apps/web/backend` then `pip install -r requirements.txt` and `uvicorn main:app --reload`
3. Frontend: `cd apps/web/frontend` then `npm install` and `npm run dev`

## Architecture
The application is structured into isolated domains:
```text
er-gemma-vision/
├── apps/
│   ├── android-lite/       # Android Jetpack mock structure
│   └── web/
│       ├── backend/        # FastAPI endpoints, Pydantic schemas, and Ollama drivers
│       └── frontend/       # React + Tailwind SPA dashboard
├── core/
│   └── prompts/            # JSON-enforced few-shot system prompts (MIMIC-IV-ED)
├── data/
│   └── emergency_guides/   # Offline ER protocols (Trauma, Chest Pain, Sepsis)
├── docs/                   # Architecture diagrams and API contracts
└── scripts/
    ├── ingest_docs.py      # FAISS ingestion script for RAG
    ├── run_dev.sh          # Linux startup script
    └── run_dev.ps1         # Windows startup script
```
See `docs/architecture.md` for full details.

---

## 🛠️ Implementation Checklist
- [x] Scaffold repository structure
- [x] Set up Python FastAPI backend with endpoints
- [x] Create React + Tailwind frontend UI flows
- [x] Scaffold Android-lite proof of concept
- [ ] Connect Frontend to Backend API
- [ ] Integrate real Gemma 4 inference (Ollama or API)
- [ ] Implement local Vector DB ingestion (`scripts/ingest_docs.py`)
- [ ] Connect Web Speech API for voice intake
- [ ] Wire up real Translation prompts

## 🏗️ What to Build First (Order)
1. **End-to-End Mocked Flow**: Start the UI and Backend with mock data to ensure UX feels correct (Completed).
2. **Gemma 4 Triage Point**: Connect the `/triage` endpoint to Gemma 4 via absolute rigid JSON schema.
3. **Retrieval**: Run `ingest_docs.py` to populate FAISS/Qdrant and feed matched text into the Triage system prompt.
4. **Voice & X-ray**: Integrate frontend dictation, follow up with X-Ray multimodal vision.
5. **Guardrails**: Add safety validation to review Gemma output before returning to user.

## 🤖 Where to Plug in AI Models
1. **Gemma 4 Triage**: `apps/web/backend/services/triage_orchestrator.py`  (Replace mock response with LLM call).
2. **Gemma 4 Translation**: `apps/web/backend/api/routes/translate.py` (Replace mock translation with LLM call).
3. **X-Ray Vision Model**: `apps/web/backend/services/xray_service.py` (Create and plug a VLM or classifier here).
4. **Voice Transcription**: `apps/web/frontend/src/App.jsx` (Use Web Speech API) OR `apps/web/backend/api/routes/intake.py` (Use an STT model like Whisper if doing backend).
5. **Safety Guardrail**: `apps/web/backend/services/triage_orchestrator.py` (Chain an LLM verification step before returning result).