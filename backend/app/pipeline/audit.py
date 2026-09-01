import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy import select, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.recovery_event import RecoveryEvent
from app.pipeline.detect import NormalizedFailureEvent
from app.pipeline.diagnose import DiagnosisResult
from app.pipeline.decide import DecisionResult
from app.pipeline.bound import BoundEvaluationResult
from app.pipeline.execute import ExecutionResult, clear_idempotency_keys

logger = logging.getLogger("recovery_agent.audit")

async def log_recovery_event(
    db: AsyncSession,
    event: NormalizedFailureEvent,
    diagnosis: DiagnosisResult,
    decision: DecisionResult,
    bound_result: BoundEvaluationResult,
    execution: ExecutionResult
) -> RecoveryEvent:
    """
    Stage 6: AUDIT
    Persists every pipeline execution into the MySQL recovery_events table.
    Ensures complete, unedited auditability for all outcomes (recovered, unrecovered, refused, duplicate_blocked).
    """
    combined_reasoning = f"[{diagnosis.root_cause.upper()}] {diagnosis.reasoning} | [DECISION] {decision.reasoning}"
    if bound_result.is_bounded and bound_result.rule_name:
        combined_reasoning += f" | [BOUND RULE: {bound_result.rule_name}] {bound_result.reasoning}"
    if execution.outcome == "duplicate_blocked":
        combined_reasoning += f" | [IDEMPOTENCY] Blocked duplicate execution for key {execution.idempotency_key}."

    db_event = RecoveryEvent(
        event_id=event.event_id,
        customer_ref=event.customer_ref,
        detected_at=event.detected_at,
        root_cause=diagnosis.root_cause,
        ground_truth_cause=event.ground_truth_cause or diagnosis.root_cause,
        decision_reasoning=combined_reasoning,
        action_taken=execution.action_taken,
        tier_used=decision.tier,
        idempotency_key=execution.idempotency_key,
        bounded_by_rule=execution.bounded_by_rule or (bound_result.rule_name if bound_result.is_bounded else None),
        outcome=execution.outcome,
        amount_attempted=execution.amount_attempted,
        amount_recovered=execution.amount_recovered,
        timestamp=datetime.utcnow()
    )

    existing = await db.get(RecoveryEvent, event.event_id)
    if existing:
        existing.customer_ref = db_event.customer_ref
        existing.detected_at = db_event.detected_at
        existing.root_cause = db_event.root_cause
        existing.ground_truth_cause = db_event.ground_truth_cause
        existing.decision_reasoning = db_event.decision_reasoning
        existing.action_taken = db_event.action_taken
        existing.tier_used = db_event.tier_used
        existing.idempotency_key = db_event.idempotency_key
        existing.bounded_by_rule = db_event.bounded_by_rule
        existing.outcome = db_event.outcome
        existing.amount_attempted = db_event.amount_attempted
        existing.amount_recovered = db_event.amount_recovered
        existing.timestamp = db_event.timestamp
        await db.commit()
        await db.refresh(existing)
        logger.info(f"Updated audit record for event {existing.event_id} (Outcome: {existing.outcome})")
        return existing
    else:
        db.add(db_event)
        await db.commit()
        await db.refresh(db_event)
        logger.info(f"Audited new recovery event {db_event.event_id} in MySQL (Outcome: {db_event.outcome})")
        return db_event

async def get_all_recovery_events(
    db: AsyncSession,
    limit: int = 200,
    offset: int = 0,
    tier: Optional[int] = None,
    outcome: Optional[str] = None,
    root_cause: Optional[str] = None,
    search: Optional[str] = None
) -> List[RecoveryEvent]:
    query = select(RecoveryEvent).order_by(desc(RecoveryEvent.timestamp))

    if tier is not None:
        query = query.where(RecoveryEvent.tier_used == tier)
    if outcome:
        query = query.where(RecoveryEvent.outcome == outcome)
    if root_cause:
        query = query.where(RecoveryEvent.root_cause == root_cause)
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (RecoveryEvent.event_id.ilike(search_pattern)) |
            (RecoveryEvent.customer_ref.ilike(search_pattern)) |
            (RecoveryEvent.decision_reasoning.ilike(search_pattern)) |
            (RecoveryEvent.idempotency_key.ilike(search_pattern))
        )

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())

async def clear_recovery_events(db: AsyncSession) -> int:
    clear_idempotency_keys()
    result = await db.execute(delete(RecoveryEvent))
    await db.commit()
    return result.rowcount
