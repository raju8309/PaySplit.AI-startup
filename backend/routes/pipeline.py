from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from db import get_db
from services.pipeline_service import (
    run_pipeline,
    run_bulk_pipeline,
    queue_bulk_job,
    get_job_status,
    process_queue,
)

router = APIRouter(prefix="/api/pipeline", tags=["Pipeline"])


# ── Schemas ───────────────────────────────────────────────────────────────
class RawExpense(BaseModel):
    description: str
    amount: Optional[float] = None
    amount_cents: Optional[int] = None
    payer_id: str
    members: List[str] = []
    split_type: str = "equal"


class BulkRequest(BaseModel):
    expenses: List[RawExpense]


class QueueRequest(BaseModel):
    expenses: List[RawExpense]


# ── Single expense pipeline ───────────────────────────────────────────────
@router.post("/process")
def process_single(expense: RawExpense, db: Session = Depends(get_db)):
    """
    Run a single expense through the full pipeline:
    validate → transform → ML categorize → save to DB
    """
    try:
        result = run_pipeline(expense.model_dump(), db)
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["errors"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Bulk expense pipeline ─────────────────────────────────────────────────
@router.post("/bulk")
def process_bulk(req: BulkRequest, db: Session = Depends(get_db)):
    """
    Process multiple expenses at once.
    Returns summary with per-expense results and ML categories.
    """
    try:
        raw_list = [e.model_dump() for e in req.expenses]
        result = run_bulk_pipeline(raw_list, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Queue job (async) ─────────────────────────────────────────────────────
@router.post("/queue")
def queue_job(req: QueueRequest):
    """
    Queue a bulk job for background processing.
    Returns job_id to check status later.
    """
    try:
        raw_list = [e.model_dump() for e in req.expenses]
        job_id = queue_bulk_job(raw_list)
        return {
            "job_id": job_id,
            "status": "queued",
            "message": f"Job {job_id} queued. Use GET /api/pipeline/jobs/{job_id} to check status.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Check job status ──────────────────────────────────────────────────────
@router.get("/jobs/{job_id}")
def check_job(job_id: str):
    """Check the status of a queued/processed job."""
    result = get_job_status(job_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return result


# ── Trigger queue processing ──────────────────────────────────────────────
@router.post("/jobs/process-queue")
def trigger_queue(db: Session = Depends(get_db)):
    """
    Manually trigger processing of all pending queued jobs.
    In production this runs on a scheduler (every 1 min).
    """
    try:
        result = process_queue(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))