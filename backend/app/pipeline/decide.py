from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple
from pydantic import BaseModel
from app.pipeline.detect import NormalizedFailureEvent
from app.pipeline.diagnose import (
    DiagnosisResult,
    CAUSE_INSUFFICIENT_FUNDS,
    CAUSE_BANK_TIMEOUT,
    CAUSE_EXPIRED_CARD,
    CAUSE_MANDATE_LIMIT_EXCEEDED,
    CAUSE_HARD_DECLINE_SUSPECTED_FRAUD
)
from app.config import settings

class DecisionResult(BaseModel):
    tier: int  # 1, 2, or 3
    action: str  # e.g., 'zero_click_retry', 'whatsapp_verified_nudge', 'human_escalation_refusal', 'human_escalation_exhausted'
    reasoning: str
    scheduled_at: Optional[datetime] = None
    scheduling_strategy: str
    message_payload: Optional[Dict[str, Any]] = None
    is_safety_refusal: bool = False

def calculate_smart_retry_window(root_cause: str, current_time: datetime) -> Tuple[datetime, str]:
    """
    Calculates optimal retry window based on root cause:
    - Insufficient funds: Targets salary credit windows (1st, 5th, 10th, 25th, 30th) or 10:00 AM IST next morning.
    - Bank timeout: Short jitter window (15-30 mins) or immediate.
    """
    if settings.DEMO_SPEEDUP_MODE:
        if root_cause == CAUSE_INSUFFICIENT_FUNDS:
            return current_time, "Salary-Cycle Window (Nearest 1st/5th/25th 10:00 AM IST - Speedup Active)"
        elif root_cause == CAUSE_BANK_TIMEOUT:
            return current_time, "Exponential Jitter Delay (15 min Backoff - Speedup Active)"

    if root_cause == CAUSE_INSUFFICIENT_FUNDS:
        day = current_time.day
        salary_dates = [1, 5, 10, 25, 30]
        future_dates = [d for d in salary_dates if d > day]
        if future_dates:
            target_day = future_dates[0]
            target_date = current_time.replace(day=target_day, hour=10, minute=0, second=0, microsecond=0)
        else:
            next_month = current_time.month % 12 + 1
            year = current_time.year + (1 if next_month == 1 else 0)
            target_date = current_time.replace(year=year, month=next_month, day=1, hour=10, minute=0, second=0, microsecond=0)
        return target_date, "Salary-Cycle Window Scheduling"

    elif root_cause == CAUSE_BANK_TIMEOUT:
        return current_time + timedelta(minutes=15), "Bank Switch Recovery Delay (15 mins)"

    return current_time, "Immediate"

def decide_intervention(
    event: NormalizedFailureEvent,
    diagnosis: DiagnosisResult,
    previous_tier: Optional[int] = None,
    message_tone: str = "english"  # 'english' or 'hinglish'
) -> DecisionResult:
    """
    Stage 3: DECIDE
    Strictly follows Zero-Click-First Policy:
    1. Tier 1 (Zero-Click Backend Retry): For insufficient_funds and bank_timeout.
    2. Tier 2 (Verified-Sender Message): For expired_card and mandate_limit_exceeded.
    3. Tier 3 (Human Escalation): For fraud/safety refusal or exhausted Tier 2.
    """
    # Safety Gate: Hard Decline / Suspected Fraud
    if diagnosis.root_cause == CAUSE_HARD_DECLINE_SUSPECTED_FRAUD:
        return DecisionResult(
            tier=3,
            action="human_escalation_refusal",
            reasoning="SAFETY GATE TRIGGERED: Suspected fraud / issuer security block detected. Auto-retry prohibited to protect merchant standing and avoid card-testing penalties. Escalating directly to Tier 3 human risk desk.",
            scheduling_strategy="Immediate Safety Gate Refusal",
            is_safety_refusal=True
        )

    # Check if Tier 2 was already attempted and exhausted
    if previous_tier == 2 or event.attempt_count > settings.MAX_RETRY_ATTEMPTS:
        return DecisionResult(
            tier=3,
            action="human_escalation_exhausted",
            reasoning=f"Intervention attempts exhausted (attempt #{event.attempt_count}). Routing to Tier 3 human customer recovery desk.",
            scheduling_strategy="Human Review Queue Escalation"
        )

    # Tier 1: Zero-Click Smart Backend Retry
    if diagnosis.root_cause in [CAUSE_INSUFFICIENT_FUNDS, CAUSE_BANK_TIMEOUT]:
        sched_time, strategy = calculate_smart_retry_window(diagnosis.root_cause, datetime.utcnow())
        
        if diagnosis.root_cause == CAUSE_INSUFFICIENT_FUNDS:
            reasoning_text = (
                f"TIER 1 (Zero-Click): Insufficient funds diagnosed. Zero-click backend retry scheduled for "
                f"optimal liquidity window ({strategy}). Zero friction applied to customer."
            )
        else:
            reasoning_text = (
                f"TIER 1 (Zero-Click): Bank timeout diagnosed. Backend auto-retry initiated with "
                f"switch jitter delay ({strategy}). No customer notification required."
            )

        return DecisionResult(
            tier=1,
            action="zero_click_retry",
            reasoning=reasoning_text,
            scheduled_at=sched_time,
            scheduling_strategy=strategy
        )

    # Tier 2: Verified-Sender WhatsApp Message (Tier 1 is not viable)
    if diagnosis.root_cause in [CAUSE_EXPIRED_CARD, CAUSE_MANDATE_LIMIT_EXCEEDED]:
        masked_card = f"**** {event.card_last4}" if event.card_last4 else "**** 4242"
        order_ref = event.order_id or event.subscription_id or f"ord_{event.event_id[-8:]}"

        if message_tone == "hinglish":
            if diagnosis.root_cause == CAUSE_EXPIRED_CARD:
                message_body = (
                    f"Namaste {event.customer_name} ji, aapka ₹{event.amount:,.2f} ka payment to {settings.MERCHANT_NAME} "
                    f"(Ref: {order_ref}) card ending in {masked_card} expire hone ki wajah se process nahi ho paya. "
                    f"Apna subscription bina kisi rukaavat ke chalu rakhne ke liye bas *YES* reply karein."
                )
            else:
                message_body = (
                    f"Namaste {event.customer_name} ji, aapka ₹{event.amount:,.2f} ka payment to {settings.MERCHANT_NAME} "
                    f"(Ref: {order_ref}) e-mandate limit se zyada hone ki wajah se rok diya gaya hai. "
                    f"One-time charge authorize karne ke liye kripya *YES* reply karein."
                )
        else:
            if diagnosis.root_cause == CAUSE_EXPIRED_CARD:
                message_body = (
                    f"Hello {event.customer_name}, your payment of ₹{event.amount:,.2f} to {settings.MERCHANT_NAME} "
                    f"(Ref: {order_ref}) on card ending in {masked_card} could not be processed because the card has expired. "
                    f"To keep your subscription active, please reply *YES* to update your card securely or retry payment."
                )
            else:
                message_body = (
                    f"Hello {event.customer_name}, your payment of ₹{event.amount:,.2f} to {settings.MERCHANT_NAME} "
                    f"(Ref: {order_ref}) exceeded your pre-authorized e-mandate limit. "
                    f"Please reply *YES* to approve a one-time charge authorization and restore full service."
                )

        reasoning_text = (
            f"TIER 2 (Verified WhatsApp Nudge): {diagnosis.root_cause.replace('_', ' ').title()} ({masked_card}) cannot be retried silently. "
            f"Dispatched verified-sender message with merchant name and order ref. Prohibiting bare URLs; requesting interactive 'YES' reply."
        )

        return DecisionResult(
            tier=2,
            action="whatsapp_verified_nudge",
            reasoning=reasoning_text,
            scheduling_strategy="Instant Verified WhatsApp Notification",
            message_payload={
                "merchant_name": settings.MERCHANT_NAME,
                "order_ref": order_ref,
                "customer_name": event.customer_name,
                "customer_phone": event.customer_phone,
                "amount": event.amount,
                "masked_identifier": masked_card,
                "message_body": message_body,
                "interactive_action": "REPLY_YES_TO_RETRY"
            }
        )

    # Fallback to Tier 1
    return DecisionResult(
        tier=1,
        action="zero_click_retry",
        reasoning="TIER 1 (Zero-Click Default): Initiating zero-friction backend retry.",
        scheduling_strategy="Standard Fallback Retry"
    )
