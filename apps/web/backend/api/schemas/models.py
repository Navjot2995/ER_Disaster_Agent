from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class Vitals(BaseModel):
    temperature: Optional[str] = Field(alias="temp", default=None)
    spo2: Optional[str] = Field(default=None)
    heart_rate: Optional[str] = Field(alias="hr", default=None)

class PatientIntake(BaseModel):
    age: Optional[str] = None
    sex: Optional[str] = None
    symptoms: Optional[str] = None
    duration: Optional[str] = None
    medical_history: Optional[str] = Field(alias="medicalHistory", default=None)
    chronic_diseases: Optional[str] = None
    current_medications: Optional[str] = None
    vitals: Optional[Vitals] = None
    xray: Optional[str] = None
    xray_findings: Optional[str] = None
    xray_image_b64: Optional[str] = None

class TriageResponse(BaseModel):
    urgency_level: str
    likely_concerns: List[str]
    immediate_next_steps: List[str]
    suggested_medications: List[str]
    suggested_questions: List[str] = Field(default_factory=list)
    escalation_triggers: List[str]
    patient_explanation: str
    clinician_summary: str
    terminology_explained: Optional[Dict[str, str]] = Field(default_factory=dict)
    safety_audit: Optional[str] = "Safety review pending."