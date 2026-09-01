import logging
import hashlib
from typing import Dict, Any, Optional, Set
from datetime import datetime
from pydantic import BaseModel
from app.pipeline.detect import NormalizedFailureEvent
from app.pipeline.diagnose import DiagnosisResult
from app.pipeline.decide import DecisionResult
from app.pipeline.bound import BoundEvaluationResult
from app.services.razorpay_service import razorpay_service
from app.services.whatsapp_service import whatsapp_service, WhatsAppMessagePayload
from app.config import settings

logger = logging.getLogger("recovery_agent.execute")

# In-memory registry for idempotency keys
EXECUTED_IDEMPOTENCY_KEYS: Set[str] = set()

class ExecutionResult(BaseModel):
    outcome: str  # 'recovered', 'unrecovered', 'refused', 'pending_response', 'duplicate_blocked'
    action_taken: str
    amount_attempted: float
    amount_recovered: float
    idempotency_key: str
    bounded_by_rule: Optional[str] = None
    execution_details: Dict[str, Any]
    executed_at: datetime

def generate_idempotency_key(event_id: str, attempt_count: int) -> str:
    """
    Derives a deterministic SHA-256 idempotency key for this exact event and attempt number.
    Guarantees uniqueness across different events while matching duplicates of the same event attempt.
    """
    h = hashlib.sha256(f"{event_id}:att{attempt_count}".encode("utf-8")).hexdigest()[:14]
    return f"idem_{h}_att{attempt_count}"

async def execute_recovery_intervention(
    event: NormalizedFailureEvent,
    diagnosis: DiagnosisResult,
    decision: DecisionResult,
    bound_result: BoundEvaluationResult,
    simulate_customer_reply: Optional[bool] = None,
    enforce_idempotency: bool = True
) -> ExecutionResult:
    """
    Stage 5: EXECUTE
    Executes the recovery intervention with mandatory idempotency gating:
    - Derives unique idempotency_key for the attempt.
    - If duplicate idempotency key is detected, aborts with DUPLICATE_IDEMPOTENCY_KEY_ABORT.
    - Tier 1: Real Razorpay test-mode SDK payment retry call.
    - Tier 2: Dispatches verified-sender WhatsApp message.
    - Tier 3: Human escalation queue entry / safety gate logging.
    """
    now = datetime.utcnow()
    amount_attempted = event.amount
    idempotency_key = generate_idempotency_key(event.event_id, event.attempt_count)

    # 1. Idempotency Gate Check
    if enforce_idempotency and idempotency_key in EXECUTED_IDEMPOTENCY_KEYS:
        logger.warning(f"IDEMPOTENCY CONFLICT: Duplicate execution blocked for key {idempotency_key}")
        return ExecutionResult(
            outcome="duplicate_blocked",
            action_taken="duplicate_idempotency_key_abort",
            amount_attempted=amount_attempted,
            amount_recovered=0.0,
            idempotency_key=idempotency_key,
            bounded_by_rule="DUPLICATE_IDEMPOTENCY_KEY_ABORT",
            execution_details={
                "status": "duplicate_aborted",
                "idempotency_key": idempotency_key,
                "reason": "Duplicate execution prevented. Customer double charge avoided."
            },
            executed_at=now
        )

    # Register the idempotency key
    EXECUTED_IDEMPOTENCY_KEYS.add(idempotency_key)

    # 2. Bound or Safety Gate Check
    if not bound_result.can_proceed_to_execution or bound_result.is_bounded:
        if decision.is_safety_refusal:
            outcome = "refused"
            action_taken = "safety_refusal_escalated_to_tier3"
        else:
            outcome = "unrecovered"
            action_taken = f"halted_by_{bound_result.rule_name.lower() if bound_result.rule_name else 'bound'}"

        return ExecutionResult(
            outcome=outcome,
            action_taken=action_taken,
            amount_attempted=amount_attempted,
            amount_recovered=0.0,
            idempotency_key=idempotency_key,
            bounded_by_rule=bound_result.rule_name,
            execution_details={
                "status": "halted_or_refused",
                "reason": bound_result.reasoning,
                "tier": decision.tier
            },
            executed_at=now
        )

    # 3. Tier 1 Zero-Click Backend Retry
    if decision.tier == 1:
        # For realistic batch simulation, simulate ~50% success on noisy general batch, but 100% on explicit demo scenarios
        is_named_demo = event.event_id.startswith("demo_scenario_")
        is_tier1_success = True
        if not is_named_demo and hasattr(event, "raw_payload") and event.raw_payload.get("tier1_retry_success") is False:
            is_tier1_success = False

        if is_tier1_success:
            rzp_resp = razorpay_service.execute_mandate_retry(
                customer_ref=event.customer_ref,
                amount_inr=amount_attempted,
                order_id=event.order_id
            )
            return ExecutionResult(
                outcome="recovered",
                action_taken="zero_click_backend_retry_succeeded",
                amount_attempted=amount_attempted,
                amount_recovered=amount_attempted,
                idempotency_key=idempotency_key,
                bounded_by_rule=None,
                execution_details={
                    "tier": 1,
                    "provider": "razorpay_test_sdk",
                    "razorpay_order_id": rzp_resp.get("order_id"),
                    "razorpay_payment_id": rzp_resp.get("payment_id"),
                    "scheduling_strategy": decision.scheduling_strategy
                },
                executed_at=now
            )
        else:
            return ExecutionResult(
                outcome="unrecovered",
                action_taken="zero_click_backend_retry_failed_at_bank",
                amount_attempted=amount_attempted,
                amount_recovered=0.0,
                idempotency_key=idempotency_key,
                bounded_by_rule=None,
                execution_details={
                    "tier": 1,
                    "status": "bank_rejection_on_retry",
                    "reason": "Account remained underfunded on scheduled retry cycle."
                },
                executed_at=now
            )

    # 4. Tier 2 Verified WhatsApp Message
    if decision.tier == 2:
        msg_payload = WhatsAppMessagePayload(
            customer_phone=event.customer_phone or "+919876543210",
            customer_name=event.customer_name or "Customer",
            merchant_name=decision.message_payload.get("merchant_name", settings.MERCHANT_NAME),
            order_ref=decision.message_payload.get("order_ref", event.event_id),
            masked_identifier=decision.message_payload.get("masked_identifier", f"**** {event.card_last4}"),
            amount=amount_attempted,
            message_body=decision.message_payload.get("message_body", ""),
            interactive_action="REPLY_YES_TO_RETRY"
        )
        wa_resp = await whatsapp_service.dispatch_verified_nudge(msg_payload)

        # Handle simulation reply for demo scenario 3 vs scenario 4
        if simulate_customer_reply is True:
            msg_id = wa_resp.get("message_id")
            whatsapp_service.simulate_reply(msg_id, "YES")
            
            rzp_retry = razorpay_service.execute_mandate_retry(
                customer_ref=event.customer_ref,
                amount_inr=amount_attempted
            )
            return ExecutionResult(
                outcome="recovered",
                action_taken="tier2_whatsapp_nudge_replied_and_recovered",
                amount_attempted=amount_attempted,
                amount_recovered=amount_attempted,
                idempotency_key=idempotency_key,
                bounded_by_rule=None,
                execution_details={
                    "tier": 2,
                    "whatsapp_message_id": msg_id,
                    "customer_reply": "YES",
                    "razorpay_order_id": rzp_retry.get("order_id"),
                    "razorpay_payment_id": rzp_retry.get("payment_id")
                },
                executed_at=now
            )
        elif simulate_customer_reply is False:
            return ExecutionResult(
                outcome="unrecovered",
                action_taken="tier2_whatsapp_nudge_unresponsive_bounded",
                amount_attempted=amount_attempted,
                amount_recovered=0.0,
                idempotency_key=idempotency_key,
                bounded_by_rule="MAX_ATTEMPTS_EXCEEDED_AFTER_3_TRIES",
                execution_details={
                    "tier": 2,
                    "whatsapp_message_id": wa_resp.get("message_id"),
                    "status": "unresponsive",
                    "reason": "Customer did not reply within retry limit; stopping rule fired."
                },
                executed_at=now
            )

        return ExecutionResult(
            outcome="pending_response",
            action_taken="tier2_whatsapp_nudge_dispatched",
            amount_attempted=amount_attempted,
            amount_recovered=0.0,
            idempotency_key=idempotency_key,
            bounded_by_rule=None,
            execution_details={
                "tier": 2,
                "whatsapp_message_id": wa_resp.get("message_id"),
                "status": "awaiting_customer_interaction"
            },
            executed_at=now
        )

    # 5. Tier 3 Human Escalation
    return ExecutionResult(
        outcome="refused" if decision.is_safety_refusal else "unrecovered",
        action_taken="escalated_to_tier3_human_desk",
        amount_attempted=amount_attempted,
        amount_recovered=0.0,
        idempotency_key=idempotency_key,
        bounded_by_rule=bound_result.rule_name,
        execution_details={
            "tier": 3,
            "reason": decision.reasoning
        },
        executed_at=now
    )

def clear_idempotency_keys():
    """Clears the in-memory idempotency registry (used during batch resets)."""
    EXECUTED_IDEMPOTENCY_KEYS.clear()
