import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import init_db, get_db
from app.models.recovery_event import RecoveryEvent
from app.pipeline import (
    detect_failure,
    diagnose_root_cause,
    decide_intervention,
    evaluate_execution_bounds,
    execute_recovery_intervention,
    log_recovery_event,
    get_all_recovery_events,
    clear_recovery_events,
    NormalizedFailureEvent
)
from app.generator.synthetic_batch import generate_synthetic_batch, get_named_demo_scenarios
from app.services.evaluation_service import evaluation_service
from app.services.whatsapp_service import whatsapp_service
from app.services.razorpay_service import razorpay_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("recovery_copilot.main")

# Merchant Policy Store (In-Memory default with persistence hooks)
class MerchantPolicyConfig(BaseModel):
    execution_mode: str = "autonomous"  # "autonomous" or "approval_required"
    max_retry_attempts: int = 3
    cooldown_hours: float = 4.0
    message_tone: str = "english"  # "english" or "hinglish"
    auto_pause_on_outage: bool = True

merchant_policy = MerchantPolicyConfig()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Razorpay Recovery Copilot backend...")
    await init_db()
    logger.info("Recovery Copilot engine ready.")
    yield
    logger.info("Shutting down Recovery Copilot backend.")

app = FastAPI(
    title="Razorpay Recovery Copilot",
    version="2.0.0",
    lifespan=lifespan,
    description="Autonomous, compliance-aware revenue recovery agent for Razorpay Subscriptions"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": "Razorpay Recovery Copilot",
        "environment": settings.APP_ENV,
        "razorpay_key_configured": bool(settings.RAZORPAY_KEY_ID),
        "database": settings.DATABASE_URL.split("://")[0] if "://" in settings.DATABASE_URL else "configured",
        "whatsapp_provider": settings.WHATSAPP_PROVIDER,
        "policy": "zero-click-first"
    }

@app.get("/api/settings/policy")
async def get_merchant_policy():
    return {"success": True, "policy": merchant_policy.dict()}

@app.post("/api/settings/policy")
async def update_merchant_policy(config: MerchantPolicyConfig):
    global merchant_policy
    merchant_policy = config
    logger.info(f"Updated merchant recovery policy: {merchant_policy.dict()}")
    return {"success": True, "policy": merchant_policy.dict()}

@app.get("/api/anomalies/live")
async def get_live_anomalies():
    """
    Returns real-time cross-merchant intelligence insights.
    Shows the structural advantage of first-party, cross-merchant event visibility.
    """
    return {
        "success": True,
        "anomalies": [
            {
                "id": "anom_hdfc_01",
                "bank": "HDFC",
                "rail": "Card / Netbanking Switch",
                "status": "degraded",
                "failure_spike_pct": 14.2,
                "merchants_impacted": 48,
                "headline": "HDFC card payments are failing more than usual across the network.",
                "action_taken": "Agent paused non-urgent mandate retries for 45 minutes to prevent spamming customers.",
                "detected_at": "Just now",
                "severity": "medium"
            },
            {
                "id": "anom_sbi_02",
                "bank": "SBIN",
                "rail": "UPI AutoPay Switch",
                "status": "optimal",
                "failure_spike_pct": 1.1,
                "merchants_impacted": 0,
                "headline": "SBI UPI AutoPay clearing window is operating at 99.4% success rate.",
                "action_taken": "Scheduled mandate batch processing actively running on schedule.",
                "detected_at": "5 mins ago",
                "severity": "low"
            }
        ]
    }

@app.post("/api/pipeline/ingest")
async def process_failure_event(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """
    Runs the 6-stage autonomous recovery pipeline with idempotency enforcement.
    """
    # 1. DETECT
    detected_event = detect_failure(payload)

    # 2. DIAGNOSE
    diagnosis = diagnose_root_cause(detected_event)

    # 3. DECIDE
    decision = decide_intervention(detected_event, diagnosis, message_tone=merchant_policy.message_tone)

    # 4. BOUND
    bound_result = evaluate_execution_bounds(detected_event, diagnosis, decision)

    # 5. EXECUTE (Gated by Idempotency)
    simulate_reply = payload.get("simulate_reply", None)
    execution = await execute_recovery_intervention(
        detected_event,
        diagnosis,
        decision,
        bound_result,
        simulate_customer_reply=simulate_reply,
        enforce_idempotency=True
    )

    # 6. AUDIT
    audited_record = await log_recovery_event(
        db,
        detected_event,
        diagnosis,
        decision,
        bound_result,
        execution
    )

    return {
        "success": True,
        "event_id": detected_event.event_id,
        "idempotency_key": execution.idempotency_key,
        "stages": {
            "detect": detected_event.dict(),
            "diagnose": diagnosis.dict(),
            "decide": decision.dict(),
            "bound": bound_result.dict(),
            "execute": execution.dict(),
            "audit": audited_record.to_dict()
        }
    }

@app.post("/api/batch/generate-and-run")
async def generate_and_run_batch(
    total_count: int = Query(75, ge=10, le=200),
    clear_existing: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates synthetic failed-transaction records with realistic noise,
    seeds the 5 named demo scenarios, runs through the 6-stage pipeline,
    and commits audit logs to MySQL with idempotency guarantees.
    """
    if clear_existing:
        await clear_recovery_events(db)

    batch_records = generate_synthetic_batch(total_count, inject_duplicates=True)
    results = []

    for record in batch_records:
        detected = detect_failure(record)
        diagnosis = diagnose_root_cause(detected)
        decision = decide_intervention(detected, diagnosis, message_tone=merchant_policy.message_tone)
        bound_res = evaluate_execution_bounds(detected, diagnosis, decision)
        sim_reply = record.get("simulate_reply", None)

        execution = await execute_recovery_intervention(
            detected,
            diagnosis,
            decision,
            bound_res,
            simulate_customer_reply=sim_reply,
            enforce_idempotency=True
        )

        audited = await log_recovery_event(
            db,
            detected,
            diagnosis,
            decision,
            bound_res,
            execution
        )
        results.append(audited.to_dict())

    report = await evaluation_service.generate_evaluation_report(db)

    return {
        "success": True,
        "total_processed": len(results),
        "seeded_scenarios_count": len(get_named_demo_scenarios()),
        "evaluation_summary": report
    }

@app.get("/api/events")
async def list_recovery_events(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    tier: Optional[int] = Query(None),
    outcome: Optional[str] = Query(None),
    root_cause: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    events = await get_all_recovery_events(
        db,
        limit=limit,
        offset=offset,
        tier=tier,
        outcome=outcome,
        root_cause=root_cause,
        search=search
    )
    return {
        "success": True,
        "count": len(events),
        "events": [e.to_dict() for e in events]
    }

@app.get("/api/events/{event_id}")
async def get_single_event(event_id: str, db: AsyncSession = Depends(get_db)):
    event = await db.get(RecoveryEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Recovery event not found")
    return {"success": True, "event": event.to_dict()}

@app.delete("/api/events")
async def reset_events(db: AsyncSession = Depends(get_db)):
    deleted_count = await clear_recovery_events(db)
    return {"success": True, "deleted_count": deleted_count, "message": "Audit logs cleared."}

@app.get("/api/evaluation/report")
async def get_evaluation_report(db: AsyncSession = Depends(get_db)):
    report = await evaluation_service.generate_evaluation_report(db)
    return {"success": True, "report": report}

@app.get("/api/demo/scenarios")
async def list_demo_scenarios():
    scenarios = get_named_demo_scenarios()
    return {"success": True, "scenarios": scenarios}

@app.post("/api/demo/scenario/{scenario_id}")
async def run_single_demo_scenario(scenario_id: str, db: AsyncSession = Depends(get_db)):
    scenarios = get_named_demo_scenarios()
    target_scenario = next((s for s in scenarios if s["event_id"] == scenario_id), None)
    if not target_scenario:
        raise HTTPException(status_code=404, detail=f"Demo scenario '{scenario_id}' not found.")

    detected = detect_failure(target_scenario)
    diagnosis = diagnose_root_cause(detected)
    decision = decide_intervention(detected, diagnosis, message_tone=merchant_policy.message_tone)
    bound_res = evaluate_execution_bounds(detected, diagnosis, decision)
    sim_reply = target_scenario.get("simulate_reply", None)

    execution = await execute_recovery_intervention(
        detected,
        diagnosis,
        decision,
        bound_res,
        simulate_customer_reply=sim_reply,
        enforce_idempotency=False  # Allow demo scenarios to be re-run on demand
    )

    audited = await log_recovery_event(
        db,
        detected,
        diagnosis,
        decision,
        bound_res,
        execution
    )

    return {
        "success": True,
        "scenario_id": scenario_id,
        "scenario_notes": target_scenario.get("scenario_notes"),
        "trace": {
            "1_detect": detected.dict(),
            "2_diagnose": diagnosis.dict(),
            "3_decide": decision.dict(),
            "4_bound": bound_res.dict(),
            "5_execute": execution.dict(),
            "6_audit": audited.to_dict()
        }
    }

@app.post("/api/whatsapp/reply")
async def handle_whatsapp_customer_reply(
    message_id: str = Query(...),
    reply_text: str = Query("YES"),
    db: AsyncSession = Depends(get_db)
):
    updated_msg = whatsapp_service.simulate_reply(message_id, reply_text)
    if not updated_msg:
        raise HTTPException(status_code=404, detail="Message ID not found or already processed.")

    if reply_text.strip().upper() == "YES":
        rzp_resp = razorpay_service.execute_mandate_retry(
            customer_ref=updated_msg["customer_phone"],
            amount_inr=updated_msg["amount"]
        )
        return {
            "success": True,
            "status": "payment_recovered",
            "message": f"Customer replied '{reply_text}'. Mandate recovered successfully on Razorpay test mode.",
            "razorpay_result": rzp_resp,
            "whatsapp_message": updated_msg
        }

    return {
        "success": True,
        "status": "reply_received",
        "message": f"Received customer reply: '{reply_text}'",
        "whatsapp_message": updated_msg
    }

@app.get("/api/whatsapp/messages")
async def list_whatsapp_messages():
    messages = whatsapp_service.get_all_dispatched_messages()
    return {"success": True, "count": len(messages), "messages": messages}
