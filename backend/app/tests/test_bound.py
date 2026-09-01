from datetime import datetime, timedelta
import pytest
from app.pipeline.detect import NormalizedFailureEvent
from app.pipeline.diagnose import (
    DiagnosisResult,
    CAUSE_INSUFFICIENT_FUNDS,
    CAUSE_HARD_DECLINE_SUSPECTED_FRAUD
)
from app.pipeline.decide import (
    DecisionResult,
    decide_intervention
)
from app.pipeline.bound import (
    evaluate_execution_bounds,
    RULE_MAX_ATTEMPTS_EXCEEDED,
    RULE_SAFETY_GATE_SUSPECTED_FRAUD,
    RULE_COOLDOWN_ACTIVE,
    RULE_RECOVERY_WINDOW_EXPIRED,
    RULE_MANDATE_REVOKED,
    RULE_NONE
)
from app.pipeline.execute import (
    execute_recovery_intervention,
    generate_idempotency_key,
    clear_idempotency_keys
)
from app.config import settings

def test_bound_rule_max_attempts_exceeded():
    event = NormalizedFailureEvent(
        customer_ref="cust_201",
        amount=1499.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Insufficient balance in account",
        attempt_count=4  # Cap is 3
    )
    diagnosis = DiagnosisResult(
        root_cause=CAUSE_INSUFFICIENT_FUNDS,
        confidence=0.95,
        reasoning="Insufficient funds",
        is_recoverable_automatically=True,
        evidence_signals={}
    )
    decision = decide_intervention(event, diagnosis)
    
    bound_result = evaluate_execution_bounds(event, diagnosis, decision)
    assert bound_result.is_bounded is True
    assert RULE_MAX_ATTEMPTS_EXCEEDED in bound_result.rule_name
    assert bound_result.can_proceed_to_execution is False

def test_bound_rule_safety_gate_fraud_refusal():
    event = NormalizedFailureEvent(
        customer_ref="cust_202",
        amount=5000.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Suspected fraud flagged by issuer",
        attempt_count=1
    )
    diagnosis = DiagnosisResult(
        root_cause=CAUSE_HARD_DECLINE_SUSPECTED_FRAUD,
        confidence=0.98,
        reasoning="Fraud flag",
        is_recoverable_automatically=False,
        evidence_signals={}
    )
    decision = decide_intervention(event, diagnosis)
    assert decision.tier == 3
    assert decision.is_safety_refusal is True

    bound_result = evaluate_execution_bounds(event, diagnosis, decision)
    assert bound_result.is_bounded is True
    assert bound_result.rule_name == RULE_SAFETY_GATE_SUSPECTED_FRAUD
    assert bound_result.can_proceed_to_execution is False

def test_bound_rule_mandate_revocation():
    event = NormalizedFailureEvent(
        customer_ref="cust_203",
        amount=999.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Customer cancelled mandate via bank netbanking",
        attempt_count=1
    )
    diagnosis = DiagnosisResult(
        root_cause=CAUSE_INSUFFICIENT_FUNDS,
        confidence=0.90,
        reasoning="Balance low",
        is_recoverable_automatically=True,
        evidence_signals={}
    )
    decision = decide_intervention(event, diagnosis)

    bound_result = evaluate_execution_bounds(event, diagnosis, decision)
    assert bound_result.is_bounded is True
    assert bound_result.rule_name == RULE_MANDATE_REVOKED
    assert bound_result.can_proceed_to_execution is False

def test_bound_rule_window_expired():
    old_time = datetime.utcnow() - timedelta(days=10)  # SLA is 7 days
    event = NormalizedFailureEvent(
        customer_ref="cust_204",
        amount=1200.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Low balance",
        attempt_count=2,
        detected_at=old_time
    )
    diagnosis = DiagnosisResult(
        root_cause=CAUSE_INSUFFICIENT_FUNDS,
        confidence=0.95,
        reasoning="Balance low",
        is_recoverable_automatically=True,
        evidence_signals={}
    )
    decision = decide_intervention(event, diagnosis)

    bound_result = evaluate_execution_bounds(event, diagnosis, decision)
    assert bound_result.is_bounded is True
    assert RULE_RECOVERY_WINDOW_EXPIRED in bound_result.rule_name
    assert bound_result.can_proceed_to_execution is False

def test_bound_valid_execution_allowed():
    event = NormalizedFailureEvent(
        customer_ref="cust_205",
        amount=1499.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Low balance in account",
        attempt_count=1,
        detected_at=datetime.utcnow()
    )
    diagnosis = DiagnosisResult(
        root_cause=CAUSE_INSUFFICIENT_FUNDS,
        confidence=0.95,
        reasoning="Low balance",
        is_recoverable_automatically=True,
        evidence_signals={}
    )
    decision = decide_intervention(event, diagnosis)

    bound_result = evaluate_execution_bounds(event, diagnosis, decision)
    assert bound_result.is_bounded is False
    assert bound_result.rule_name == RULE_NONE
    assert bound_result.can_proceed_to_execution is True

@pytest.mark.asyncio
async def test_idempotency_duplicate_blocking():
    clear_idempotency_keys()
    event = NormalizedFailureEvent(
        event_id="evt_test_idem_01",
        customer_ref="cust_idem_01",
        amount=1499.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Insufficient funds",
        attempt_count=1
    )
    diagnosis = DiagnosisResult(
        root_cause=CAUSE_INSUFFICIENT_FUNDS,
        confidence=0.95,
        reasoning="Insufficient balance",
        is_recoverable_automatically=True,
        evidence_signals={}
    )
    decision = decide_intervention(event, diagnosis)
    bound_result = evaluate_execution_bounds(event, diagnosis, decision)

    # First attempt: succeeds
    res1 = await execute_recovery_intervention(event, diagnosis, decision, bound_result, enforce_idempotency=True)
    assert res1.outcome == "recovered"
    assert res1.idempotency_key.startswith("idem_")

    # Second parallel/duplicate attempt with identical event and attempt number: blocked!
    res2 = await execute_recovery_intervention(event, diagnosis, decision, bound_result, enforce_idempotency=True)
    assert res2.outcome == "duplicate_blocked"
    assert res2.bounded_by_rule == "DUPLICATE_IDEMPOTENCY_KEY_ABORT"
    assert res2.amount_recovered == 0.0
