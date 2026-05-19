from fastapi import APIRouter
import json
import os

router = APIRouter()

@router.get("/demo-cases")
def get_demo_cases():
    cases_path = os.path.join(os.path.dirname(__file__), "../../../../core/demo_cases/cases.json")
    with open(cases_path, "r") as f:
        cases = json.load(f)
    return cases