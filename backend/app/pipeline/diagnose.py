import re
from typing import Dict, Any, Tuple
from pydantic import BaseModel
from app.pipeline.detect import NormalizedFailureEvent

class DiagnosisResult(BaseModel):
    root_cause: str  # One of: insufficient_funds, bank_timeout, expired_card, mandate_limit_exceeded, hard_decline_suspected_fraud
    confidence: float
    reasoning: str
    is_recoverable_automatically: bool
    evidence_signals: Dict[str, Any]

# Canonical Root Causes
CAUSE_INSUFFICIENT_FUNDS = "insufficient_funds"
CAUSE_BANK_TIMEOUT = "bank_timeout"
CAUSE_EXPIRED_CARD = "expired_card"
CAUSE_MANDATE_LIMIT_EXCEEDED = "mandate_limit_exceeded"
CAUSE_HARD_DECLINE_SUSPECTED_FRAUD = "hard_decline_suspected_fraud"

ALL_ROOT_CAUSES = [
    CAUSE_INSUFFICIENT_FUNDS,
    CAUSE_BANK_TIMEOUT,
    CAUSE_EXPIRED_CARD,
    CAUSE_MANDATE_LIMIT_EXCEEDED,
    CAUSE_HARD_DECLINE_SUSPECTED_FRAUD
]

def diagnose_root_cause(event: NormalizedFailureEvent) -> DiagnosisResult:
    """
    Stage 2: DIAGNOSE
    Classifies root cause into exactly one of 5 canonical categories based ONLY on failure signals.
    Does NOT have access to ground_truth_cause.
    Handles real-world ambiguity in bank error strings.
    """
    error_desc = (event.error_description or "").lower()
    error_code = (event.error_code or "").upper()
    error_reason = (event.error_reason or "").lower()

    combined_text = f"{error_desc} {error_code} {error_reason}"

    # Priority 1: Check Hard Decline / Suspected Fraud (Safety Gate must be high-sensitivity)
    fraud_keywords = [
        "suspected fraud", "fraud_suspected", "security violation", "security_violation",
        "card blocked by issuer", "card_blocked", "stolen_card", "stolen card",
        "risk controls", "issuer_risk_decline", "card-testing", "flagged card",
        "hotlisted", "fraudulent", "high risk", "restricted card", "lost card"
    ]
    if any(k in combined_text for k in fraud_keywords):
        return DiagnosisResult(
            root_cause=CAUSE_HARD_DECLINE_SUSPECTED_FRAUD,
            confidence=0.98,
            reasoning="Issuer bank or gateway risk engine flagged transaction under security/fraud protocol. Auto-retry strictly prohibited to avoid card-testing penalties.",
            is_recoverable_automatically=False,
            evidence_signals={"trigger": "fraud_or_risk_keywords", "matched_text": [k for k in fraud_keywords if k in combined_text]}
        )

    # Priority 2: Check Mandate Limit Exceeded
    mandate_keywords = [
        "mandate limit", "mandate_limit", "maximum permissible limit", "exceeds maximum allowed",
        "mandate_amount_limit_exceeded", "limit exceeded", "exceeds mandate", "permissible limit",
        "rbi mandate cap", "e-mandate limit"
    ]
    if any(k in combined_text for k in mandate_keywords):
        return DiagnosisResult(
            root_cause=CAUSE_MANDATE_LIMIT_EXCEEDED,
            confidence=0.95,
            reasoning="Transaction amount exceeds pre-approved RBI e-mandate limit. Backend retry will persistently fail without customer authorization to elevate mandate.",
            is_recoverable_automatically=False,
            evidence_signals={"trigger": "mandate_limit_keywords", "amount": event.amount}
        )

    # Priority 3: Check Expired Card
    expired_keywords = [
        "expired card", "card expired", "invalid expiry", "card_expired",
        "validity passed", "expiry date", "expired_card", "card is inactive"
    ]
    if any(k in combined_text for k in expired_keywords):
        return DiagnosisResult(
            root_cause=CAUSE_EXPIRED_CARD,
            confidence=0.96,
            reasoning="Payment instrument has expired. Requires customer intervention with updated payment details; backend retry on stale credentials is futile.",
            is_recoverable_automatically=False,
            evidence_signals={"trigger": "expired_card_keywords", "card_last4": event.card_last4}
        )

    # Priority 4: Check Bank Timeout / Gateway Transient Issues
    timeout_keywords = [
        "timeout", "timed out", "bank unavailable", "bank_system_error",
        "gateway_error", "gateway timeout", "switch timeout", "npci switch lag",
        "bank down", "internal server error", "504", "502", "network glitch",
        "technical decline", "temporary communication failure", "switch lag"
    ]
    if any(k in combined_text for k in timeout_keywords) or error_code in ["GATEWAY_ERROR", "BAD_REQUEST_ERROR_BANK_SYSTEM_ERROR"]:
        return DiagnosisResult(
            root_cause=CAUSE_BANK_TIMEOUT,
            confidence=0.92,
            reasoning="Transient network latency or issuer bank core switch timeout. Candidate for zero-click smart retry with exponential jitter.",
            is_recoverable_automatically=True,
            evidence_signals={"trigger": "bank_timeout_keywords", "error_code": error_code, "issuer_bank": event.issuer_bank}
        )

    # Priority 5: Insufficient Funds
    insufficient_keywords = [
        "insufficient", "balance", "low funds", "insufficient_funds",
        "not enough funds", "account balance low", "insufficient balance",
        "payment_failed_insufficient_funds"
    ]
    if any(k in combined_text for k in insufficient_keywords):
        return DiagnosisResult(
            root_cause=CAUSE_INSUFFICIENT_FUNDS,
            confidence=0.95,
            reasoning="Customer account balance insufficient (insufficient funds) at time of mandate billing. Prime candidate for zero-click salary-credit window scheduling.",
            is_recoverable_automatically=True,
            evidence_signals={"trigger": "insufficient_funds_keywords", "amount": event.amount}
        )

    # Fallback heuristic for ambiguous error payloads
    if error_code == "BAD_REQUEST_ERROR":
        return DiagnosisResult(
            root_cause=CAUSE_INSUFFICIENT_FUNDS,
            confidence=0.68,
            reasoning="Ambiguous debit failure without explicit technical flags. Inferred as balance deficit for zero-click scheduling.",
            is_recoverable_automatically=True,
            evidence_signals={"trigger": "ambiguous_bad_request_fallback"}
        )
    
    return DiagnosisResult(
        root_cause=CAUSE_BANK_TIMEOUT,
        confidence=0.65,
        reasoning="Unspecified transient error signal. Classified as bank timeout for zero-click backend retry.",
        is_recoverable_automatically=True,
        evidence_signals={"trigger": "ambiguous_transient_fallback"}
    )
