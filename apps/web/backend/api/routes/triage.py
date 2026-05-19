from fastapi import APIRouter
from api.schemas.models import PatientIntake, TriageResponse
from services.triage_orchestrator import run_triage

router = APIRouter()

@router.post("/triage", response_model=TriageResponse)
def triage_patient(data: PatientIntake):
    # Pass data to orchestrator
    result = run_triage(data)
    return result