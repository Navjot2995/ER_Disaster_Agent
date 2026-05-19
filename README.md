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

## Core Features
1. **Fully Offline AI Inference**: Operates 100% locally via Ollama with the Gemma 4 model, ensuring zero cloud dependency and strict patient data privacy.
2. **Multimodal Medical Imaging**: Native support for processing both Chest X-Rays and Brain CT Scans using Gemma 4's multimodal vision capabilities.
3. **Agentic RAG for Clinical Precision**: A local FAISS Vector Database automatically retrieves physical emergency protocols (WHO Trauma Guidelines, CTAS, qSOFA) to ground the LLM's diagnostic reasoning.
4. **Offline Voice Dictation**: Clinicians can rapidly input symptoms hands-free using local audio transcription.
5. **Real-time Multilingual Support**: Instantly streams translation for non-English speaking patients directly on the frontend.
6. **AI Safety Review Loop**: A secondary autonomous "LLM-as-a-Judge" agent audits the generated triage urgency levels to prevent hallucinations and under-triage of critical conditions.

## Project Documentation
Detailed documentation for the hackathon judges can be found in the `docs/` folder:
- `kaggle_writeup.md`: Our official project submission and technical architecture overview.
- `video_script.md`: The script used for our 3-minute demo presentation.
- `google_ecosystem_scaleup.md`: Our roadmap for scaling to Google Cloud Platform and LiteRT.
- `COMPETITION_COMPLIANCE.md`: How we aligned with the Hackathon's Safety and Trust tracks.