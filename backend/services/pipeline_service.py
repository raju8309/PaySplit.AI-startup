"""
Data Pipeline Service
Handles bulk expense ingestion, auto-categorization, and transformation.
"""
import sys
import os
from typing import List, Dict, Optional
from datetime import datetime
import uuid

# Add ml/models to path
ml_models_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'ml', 'models'))
sys.path.insert(0, ml_models_path)

from transaction_categorizer import TransactionCategorizer

# Initialize categorizer once
categorizer = TransactionCategorizer()


# ── In-memory job queue (use Celery + Redis in production) ─────────────────
_job_queue: List[dict] = []
_job_results: dict = {}


def _new_job_id() -> str:
    return str(uuid.uuid4())[:8]


# ── Step 1: Validate raw expense ───────────────────────────────────────────
def validate_expense(raw: dict) -> dict:
    """Validate and normalize a raw expense dict."""
    errors = []

    if not raw.get("description"):
        errors.append("description is required")
    if not raw.get("amount") and not raw.get("amount_cents"):
        errors.append("amount or amount_cents is required")
    if not raw.get("payer_id"):
        errors.append("payer_id is required")

    if errors:
        return {"valid": False, "errors": errors}

    return {"valid": True, "errors": []}


# ── Step 2: Transform raw → structured ────────────────────────────────────
def transform_expense(raw: dict) -> dict:
    """Convert raw input into structured expense format."""
    # Handle both dollars and cents input
    if raw.get("amount_cents"):
        amount_cents = int(raw["amount_cents"])
    elif raw.get("amount"):
        amount_cents = int(float(raw["amount"]) * 100)
    else:
        amount_cents = 0

    return {
        "id": raw.get("id") or str(uuid.uuid4()),
        "description": raw["description"].strip(),
        "amount_cents": amount_cents,
        "amount_dollars": round(amount_cents / 100, 2),
        "payer_id": raw["payer_id"],
        "members": raw.get("members", []),
        "split_type": raw.get("split_type", "equal"),
        "created_at": raw.get("created_at") or datetime.utcnow().isoformat(),
        "raw": raw,  # keep original
    }


# ── Step 3: Enrich with ML categorization ─────────────────────────────────
def enrich_expense(expense: dict) -> dict:
    """Auto-categorize expense using ML model."""
    category, confidence = categorizer.categorize(expense["description"])
    expense["category"] = category
    expense["category_confidence"] = confidence
    expense["categorized_at"] = datetime.utcnow().isoformat()
    return expense


# ── Step 4: Persist to DB ─────────────────────────────────────────────────
def persist_expense(expense: dict, db) -> dict:
    """Save structured expense to database."""
    from models.expense import Expense

    record = Expense(
        id=expense["id"],
        description=expense["description"],
        amount_cents=expense["amount_cents"],
        payer_id=expense["payer_id"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    expense["persisted"] = True
    return expense


# ── Main pipeline: process single expense ─────────────────────────────────
def run_pipeline(raw: dict, db=None) -> dict:
    """
    Full pipeline for one expense:
    validate → transform → enrich → persist
    """
    # Step 1: Validate
    validation = validate_expense(raw)
    if not validation["valid"]:
        return {
            "success": False,
            "stage": "validation",
            "errors": validation["errors"],
        }

    # Step 2: Transform
    expense = transform_expense(raw)

    # Step 3: Enrich (ML categorization)
    expense = enrich_expense(expense)

    # Step 4: Persist (if db provided)
    if db:
        try:
            expense = persist_expense(expense, db)
        except Exception as e:
            expense["persisted"] = False
            expense["persist_error"] = str(e)

    return {
        "success": True,
        "expense": expense,
    }


# ── Bulk pipeline: process multiple expenses ───────────────────────────────
def run_bulk_pipeline(raw_expenses: List[dict], db=None) -> dict:
    """
    Process a batch of expenses through the full pipeline.
    Returns summary with success/failure counts.
    """
    job_id = _new_job_id()
    results = []
    success_count = 0
    error_count = 0

    for i, raw in enumerate(raw_expenses):
        result = run_pipeline(raw, db)
        result["index"] = i
        results.append(result)
        if result["success"]:
            success_count += 1
        else:
            error_count += 1

    summary = {
        "job_id": job_id,
        "total": len(raw_expenses),
        "success": success_count,
        "errors": error_count,
        "processed_at": datetime.utcnow().isoformat(),
        "results": results,
    }

    # Store result for async retrieval
    _job_results[job_id] = summary
    return summary


# ── Async job queue ────────────────────────────────────────────────────────
def queue_bulk_job(raw_expenses: List[dict]) -> str:
    """Queue a bulk job for background processing. Returns job_id."""
    job_id = _new_job_id()
    _job_queue.append({
        "job_id": job_id,
        "expenses": raw_expenses,
        "queued_at": datetime.utcnow().isoformat(),
        "status": "pending",
    })
    _job_results[job_id] = {"status": "pending", "job_id": job_id}
    return job_id


def get_job_status(job_id: str) -> Optional[dict]:
    """Get status/result of a job by ID."""
    return _job_results.get(job_id)


def process_queue(db=None):
    """Process all pending jobs in queue (call this on a scheduler)."""
    processed = 0
    for job in _job_queue:
        if job["status"] == "pending":
            job["status"] = "processing"
            result = run_bulk_pipeline(job["expenses"], db)
            _job_results[job["job_id"]] = {**result, "status": "completed"}
            job["status"] = "completed"
            processed += 1
    return {"processed_jobs": processed}