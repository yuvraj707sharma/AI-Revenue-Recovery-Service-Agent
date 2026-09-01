import pytest
from app.pipeline.detect import NormalizedFailureEvent
from app.pipeline.diagnose import (
    diagnose_root_cause,
    CAUSE_INSUFFICIENT_FUNDS,
    CAUSE_BANK_TIMEOUT,
    CAUSE_EXPIRED_CARD,
    CAUSE_MANDATE_LIMIT_EXCEEDED,
    CAUSE_HARD_DECLINE_SUSPECTED_FRAUD
)

def test_diagnose_insufficient_funds():
    event = NormalizedFailureEvent(
        customer_ref="cust_101",
        amount=1499.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Your payment has failed due to insufficient balance in your account.",
        error_reason="payment_failed_insufficient_funds"
    )
    result = diagnose_root_cause(event)
    assert result.root_cause == CAUSE_INSUFFICIENT_FUNDS
    assert result.is_recoverable_automatically is True
    assert result.confidence >= 0.90
    assert "insufficient funds" in result.reasoning.lower()

def test_diagnose_bank_timeout():
    event = NormalizedFailureEvent(
        customer_ref="cust_102",
        amount=2999.00,
        error_code="GATEWAY_ERROR",
        error_description="Gateway timed out while communicating with issuer bank switch.",
        error_reason="gateway_timeout"
    )
    result = diagnose_root_cause(event)
    assert result.root_cause == CAUSE_BANK_TIMEOUT
    assert result.is_recoverable_automatically is True
    assert result.confidence >= 0.90
    assert "timeout" in result.reasoning.lower()

def test_diagnose_expired_card():
    event = NormalizedFailureEvent(
        customer_ref="cust_103",
        amount=999.00,
        error_code="PAYMENT_AUTHENTICATION_ERROR",
        error_description="The card has expired or the expiration date is invalid.",
        error_reason="card_expired"
    )
    result = diagnose_root_cause(event)
    assert result.root_cause == CAUSE_EXPIRED_CARD
    assert result.is_recoverable_automatically is False
    assert result.confidence >= 0.90
    assert "expired" in result.reasoning.lower()

def test_diagnose_mandate_limit_exceeded():
    event = NormalizedFailureEvent(
        customer_ref="cust_104",
        amount=25000.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="The transaction amount exceeds the maximum permissible limit for this e-mandate.",
        error_reason="mandate_amount_limit_exceeded"
    )
    result = diagnose_root_cause(event)
    assert result.root_cause == CAUSE_MANDATE_LIMIT_EXCEEDED
    assert result.is_recoverable_automatically is False
    assert result.confidence >= 0.90
    assert "mandate" in result.reasoning.lower()

def test_diagnose_hard_decline_suspected_fraud_safety_gate():
    event = NormalizedFailureEvent(
        customer_ref="cust_105",
        amount=8999.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Transaction declined by bank risk controls due to suspected fraud / card blocked by issuer.",
        error_reason="issuer_risk_decline"
    )
    result = diagnose_root_cause(event)
    assert result.root_cause == CAUSE_HARD_DECLINE_SUSPECTED_FRAUD
    assert result.is_recoverable_automatically is False
    assert result.confidence >= 0.95
    assert "fraud" in result.reasoning.lower()

def test_diagnose_security_violation_card_testing():
    event = NormalizedFailureEvent(
        customer_ref="cust_106",
        amount=1.00,
        error_code="BAD_REQUEST_ERROR",
        error_description="Security violation: card hotlisted by issuer fraud monitoring switch.",
        error_reason="security_violation"
    )
    result = diagnose_root_cause(event)
    assert result.root_cause == CAUSE_HARD_DECLINE_SUSPECTED_FRAUD
    assert result.is_recoverable_automatically is False
