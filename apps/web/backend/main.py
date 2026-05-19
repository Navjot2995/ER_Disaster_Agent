from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import triage, intake, translate, export, demo, voice_parse, transcribe, chat

app = FastAPI(title="ER Gemma Vision", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(triage.router)
app.include_router(intake.router)
app.include_router(translate.router)
app.include_router(export.router)
app.include_router(demo.router)
app.include_router(voice_parse.router)
app.include_router(transcribe.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "ER Gemma Vision System Active"}