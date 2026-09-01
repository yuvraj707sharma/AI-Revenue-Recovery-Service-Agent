from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
import uuid

class NormalizedFailureEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    customer_ref: str
    order_id: Optional[str] = None
    payment_id: Optional[str] = None
    subscription_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    error_code: str
    error_description: str
    error_source: str = "bank"
    error_step: str = "payment_authorization"
    error_reason: Optional[str] = None
    card_last4: Optional[str] = "4242"
    card_network: Optional[str] = "Visa"
    issuer_bank: Optional[str] = "HDFC"
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    attempt_count: int = 1
    # Held separately for evaluation benchmark only; NEVER passed to or read by DIAGNOSE stage
    ground_truth_cause: Optional[str] = None
    customer_name: Optional[str] = "Aarav Sharma"
    customer_phone: Optional[str] = "+919876543210"
    raw_payload: Dict[str, Any] = Field(default_factory=dict)

def detect_failure(payload: Dict[str, Any]) -> NormalizedFailureEvent:
    """
    Stage 1: DETECT
    Ingests failure events shaped like real Razorpay payment.failed or subscription.charged webhooks.
    Extracts and normalizes critical payment failure attributes.
    """
    if "error_code" in payload and "customer_ref" in payload and "amount" in payload:
        return NormalizedFailureEvent(
            event_id=payload.get("event_id", f"evt_{uuid.uuid4().hex[:12]}"),
            customer_ref=payload.get("customer_ref", "cust_anonymous"),
            order_id=payload.get("order_id"),
            payment_id=payload.get("payment_id"),
            subscription_id=payload.get("subscription_id"),
            amount=float(payload.get("amount", 0.0)),
            currency=payload.get("currency", "INR"),
            error_code=payload.get("error_code", "UNKNOWN_ERROR"),
            error_description=payload.get("error_description", ""),
            error_source=payload.get("error_source", "bank"),
            error_step=payload.get("error_step", "payment_authorization"),
            error_reason=payload.get("error_reason"),
            card_last4=payload.get("card_last4", "4242"),
            card_network=payload.get("card_network", "Visa"),
            issuer_bank=payload.get("issuer_bank", "HDFC"),
            detected_at=payload.get("detected_at") or datetime.utcnow(),
            attempt_count=int(payload.get("attempt_count", 1)),
            ground_truth_cause=payload.get("ground_truth_cause"),
            customer_name=payload.get("customer_name", "Aarav Sharma"),
            customer_phone=payload.get("customer_phone", "+919876543210"),
            raw_payload=payload
        )

    # Standard Razorpay Webhook Payload structure
    payment_entity = (
        payload.get("payload", {}).get("payment", {}).get("entity", {})
        or payload.get("entity", {})
        or payload
    )

    error_code = payment_entity.get("error_code") or payload.get("error_code", "BAD_REQUEST_ERROR")
    error_desc = payment_entity.get("error_description") or payload.get("error_description", "Payment failed at bank")
    error_source = payment_entity.get("error_source") or "bank"
    error_step = payment_entity.get("error_step") or "payment_authorization"
    error_reason = payment_entity.get("error_reason")

    amount_paisa = payment_entity.get("amount", 0)
    amount_inr = float(amount_paisa) / 100.0 if amount_paisa > 1000 and isinstance(amount_paisa, int) else float(amount_paisa or 0.0)

    customer_id = (
        payment_entity.get("customer_id")
        or payment_entity.get("email")
        or payment_entity.get("contact")
        or payload.get("customer_ref", f"cust_{uuid.uuid4().hex[:8]}")
    )

    card_info = payment_entity.get("card", {})
    card_last4 = card_info.get("last4") or payment_entity.get("card_last4", "4242")
    card_network = card_info.get("network") or payment_entity.get("card_network", "Visa")
    issuer_bank = payment_entity.get("bank") or payment_entity.get("issuer_bank", "HDFC")

    return NormalizedFailureEvent(
        event_id=payload.get("event_id") or payload.get("id") or f"evt_{uuid.uuid4().hex[:12]}",
        customer_ref=str(customer_id),
        order_id=payment_entity.get("order_id"),
        payment_id=payment_entity.get("id"),
        subscription_id=payment_entity.get("subscription_id") or payment_entity.get("invoice_id"),
        amount=amount_inr,
        currency=payment_entity.get("currency", "INR"),
        error_code=error_code,
        error_description=error_desc,
        error_source=error_source,
        error_step=error_step,
        error_reason=error_reason,
        card_last4=card_last4,
        card_network=card_network,
        issuer_bank=issuer_bank,
        detected_at=datetime.utcnow(),
        attempt_count=int(payload.get("attempt_count", 1)),
        ground_truth_cause=payload.get("ground_truth_cause"),
        customer_name=payment_entity.get("notes", {}).get("customer_name") or payload.get("customer_name", "Customer"),
        customer_phone=payment_entity.get("contact") or payload.get("customer_phone", "+919876543210"),
        raw_payload=payload
    )
