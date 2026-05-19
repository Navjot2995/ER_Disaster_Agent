from fastapi import APIRouter

router = APIRouter()

@router.post("/export")
def export_report():
    return {"file_url": "/downloads/report.pdf"}