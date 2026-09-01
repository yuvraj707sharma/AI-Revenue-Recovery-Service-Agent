from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pydantic import BaseModel
from app.pipeline.detect import NormalizedFailureEvent
from app.pipeline.diagnose import DiagnosisResult, CAUSE_HARD_DECLINE_SUSPECTED_FRAUD
from app.pipeline.decide import DecisionResult
from app.config import settings

class BoundEvaluationResult(BaseModel):
    is_bounded: bool  # True if execution must be halted or altered
    rule_name: Optional[str] = None  # e.g., 'MAX_ATTEMPTS_EXCEEDED', 'SAFETY_GATE_SUSPECTED_FRAUD', 'COOLDOWN_ACTIVE'
    reasoning: str
    can_proceed_to_execution: bool

# Canonical Rule Names
RULE_MAX_ATTEMPTS_EXCEEDED = "MAX_ATTEMPTS_EXCEEDED"
RULE_SAFETY_GATE_SUSPECTED_FRAUD = "SAFETY_GATE_SUSPECTED_FRAUD"
RULE_COOLDOWN_ACTIVE = "COOLDOWN_ACTIVE"
RULE_RECOVERY_WINDOW_EXPIRED = "RECOVERY_WINDOW_EXPIRED"
RULE_MANDATE_REVOKED = "MANDATE_REVOKED"
RULE_NONE = "NONE"

def evaluate_execution_bounds(
    event: NormalizedFailureEvent,
    diagnosis: DiagnosisResult,
    decision: DecisionResult,
    last_attempt_time: Optional[datetime] = None,
    mandate_status: str = "active"
) -> BoundEvaluationResult:
    """
    Stage 4: BOUND
    Enforces hard execution bounds and stopping rules before allowing another attempt:
    1. Safety Gate: Blocks automated action on suspected fraud.
    2. Mandate Revocation: Halts if mandate has been cancelled or revoked.
    3. Max Attempts: Halts retries if attempt count exceeds MAX_RETRY_ATTEMPTS (3).
    4. Window Expired: Halts attempts if failure is older than MAX_RECOVERY_WINDOW_DAYS (7).
    5. Cooldown: Blocks rapid successive retries within minimum cooldown window.
    """
    # 1. Safety Gate Rule Check
    if decision.is_safety_refusal or diagnosis.root_cause == CAUSE_HARD_DECLINE_SUSPECTED_FRAUD:
        return BoundEvaluationResult(
            is_bounded=True,
            rule_name=RULE_SAFETY_GATE_SUSPECTED_FRAUD,
            reasoning="BOUND APPLIED: Safety gate active. Suspected fraud or risk block prohibits automated retry. Refusal logged and escalated.",
            can_proceed_to_execution=False
        )

    # 2. Mandate Revocation Check
    error_text = (event.error_description or "").lower()
    if mandate_status.lower() in ["revoked", "cancelled", "paused"] or "cancelled mandate" in error_text or "mandate revoked" in error_text:
        return BoundEvaluationResult(
            is_bounded=True,
            rule_name=RULE_MANDATE_REVOKED,
            reasoning="BOUND APPLIED: Customer e-mandate is revoked/cancelled. Automated retries halted.",
            can_proceed_to_execution=False
        )

    # 3. Max Attempts Cap
    if event.attempt_count > settings.MAX_RETRY_ATTEMPTS:
        return BoundEvaluationResult(
            is_bounded=True,
            rule_name=f"{RULE_MAX_ATTEMPTS_EXCEEDED}_AFTER_{settings.MAX_RETRY_ATTEMPTS}_TRIES",
            reasoning=f"BOUND APPLIED: Maximum retry attempt limit ({settings.MAX_RETRY_ATTEMPTS}) reached. Stopping rule fired to prevent spam and fees.",
            can_proceed_to_execution=False
        )

    # 4. Recovery Window Expiry (7 days)
    if event.detected_at:
        age = datetime.utcnow() - event.detected_at
        if age > timedelta(days=settings.MAX_RECOVERY_WINDOW_DAYS):
            return BoundEvaluationResult(
                is_bounded=True,
                rule_name=f"{RULE_RECOVERY_WINDOW_EXPIRED}_GT_{settings.MAX_RECOVERY_WINDOW_DAYS}D",
                reasoning=f"BOUND APPLIED: Failure is {age.days} days old, exceeding the {settings.MAX_RECOVERY_WINDOW_DAYS}-day recovery SLA. Halting automated cycle.",
                can_proceed_to_execution=False
            )

    # 5. Minimum Cooldown Check (if last attempt time is provided)
    if last_attempt_time and not settings.DEMO_SPEEDUP_MODE:
        elapsed = datetime.utcnow() - last_attempt_time
        if elapsed < timedelta(hours=settings.MIN_COOLDOWN_HOURS):
            remaining_mins = int((timedelta(hours=settings.MIN_COOLDOWN_HOURS) - elapsed).total_seconds() / 60)
            return BoundEvaluationResult(
                is_bounded=True,
                rule_name=f"{RULE_COOLDOWN_ACTIVE}_{settings.MIN_COOLDOWN_HOURS}H",
                reasoning=f"BOUND APPLIED: Cooldown period active ({remaining_mins} mins remaining). Preventing rapid retry spam.",
                can_proceed_to_execution=False
            )

    # All bounds satisfied
    return BoundEvaluationResult(
        is_bounded=False,
        rule_name=RULE_NONE,
        reasoning="All execution bounds satisfied (Attempts <= 3, SLA active, Cooldown clear). Proceeding with intervention.",
        can_proceed_to_execution=True
    )
