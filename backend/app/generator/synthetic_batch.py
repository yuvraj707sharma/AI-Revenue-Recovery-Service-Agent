import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.pipeline.diagnose import (
    CAUSE_INSUFFICIENT_FUNDS,
    CAUSE_BANK_TIMEOUT,
    CAUSE_EXPIRED_CARD,
    CAUSE_MANDATE_LIMIT_EXCEEDED,
    CAUSE_HARD_DECLINE_SUSPECTED_FRAUD,
    ALL_ROOT_CAUSES
)

FIRST_NAMES = ["Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Neha", "Rahul", "Sneha", "Aditya", "Pooja", "Arjun", "Divya", "Siddharth", "Kavya", "Karan", "Ishaan", "Meera", "Varun", "Tanvi", "Sanjay", "Deepak", "Anjali", "Gaurav", "Simran", "Rakesh"]
LAST_NAMES = ["Sharma", "Verma", "Patel", "Reddy", "Mehta", "Iyer", "Nair", "Deshmukh", "Chopra", "Gupta", "Malhotra", "Kulkarni", "Bhatt", "Singhania", "Mukherjee", "Rao", "Joshi", "Das"]
BANKS = ["HDFC", "ICICI", "SBIN", "AXIS", "KKBK", "PUNB", "YESB", "IDFC", "BOB"]
CARD_NETWORKS = ["Visa", "MasterCard", "RuPay"]

# Explicit templates for clear signals
CLEAR_TEMPLATES = {
    CAUSE_INSUFFICIENT_FUNDS: [
        {
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "Your payment has failed due to insufficient balance in your account.",
            "error_reason": "payment_failed_insufficient_funds",
            "error_source": "bank",
            "error_step": "payment_authorization"
        },
        {
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "Transaction declined by issuer bank: account balance low for mandate debit.",
            "error_reason": "payment_failed_insufficient_funds",
            "error_source": "bank",
            "error_step": "payment_authorization"
        }
    ],
    CAUSE_BANK_TIMEOUT: [
        {
            "error_code": "GATEWAY_ERROR",
            "error_description": "Gateway timed out while communicating with issuer bank switch.",
            "error_reason": "gateway_timeout",
            "error_source": "gateway",
            "error_step": "payment_authorization"
        },
        {
            "error_code": "BAD_REQUEST_ERROR_BANK_SYSTEM_ERROR",
            "error_description": "Issuer bank network is currently down or unavailable. Please try again later.",
            "error_reason": "bank_system_error",
            "error_source": "bank",
            "error_step": "payment_authorization"
        }
    ],
    CAUSE_EXPIRED_CARD: [
        {
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "The card has expired or the expiration date is invalid.",
            "error_reason": "card_expired",
            "error_source": "customer",
            "error_step": "payment_authentication"
        },
        {
            "error_code": "PAYMENT_AUTHENTICATION_ERROR",
            "error_description": "Card validity passed. Update card expiry details to authorize subscription.",
            "error_reason": "card_expired",
            "error_source": "bank",
            "error_step": "payment_authorization"
        }
    ],
    CAUSE_MANDATE_LIMIT_EXCEEDED: [
        {
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "The transaction amount exceeds the maximum permissible limit for this e-mandate.",
            "error_reason": "mandate_amount_limit_exceeded",
            "error_source": "bank",
            "error_step": "payment_authorization"
        },
        {
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "Debit amount is greater than pre-approved RBI mandate limit cap.",
            "error_reason": "mandate_limit_exceeded",
            "error_source": "bank",
            "error_step": "payment_authorization"
        }
    ],
    CAUSE_HARD_DECLINE_SUSPECTED_FRAUD: [
        {
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "Transaction declined by bank risk controls due to suspected fraud / card blocked by issuer.",
            "error_reason": "issuer_risk_decline",
            "error_source": "bank",
            "error_step": "payment_authorization"
        },
        {
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "Security violation: card hotlisted by issuer fraud monitoring switch.",
            "error_reason": "security_violation",
            "error_source": "bank",
            "error_step": "payment_authorization"
        }
    ]
}

# Noisy & Ambiguous error templates (reflecting real bank rails ambiguity and cross-tier confusion)
NOISY_TEMPLATES = [
    {
        "true_cause": CAUSE_BANK_TIMEOUT,
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Transaction declined by bank switch without specific decline reason (Response 05).",
        "error_reason": "generic_decline",
        "error_source": "bank",
        "error_step": "payment_authorization"
    },
    {
        "true_cause": CAUSE_BANK_TIMEOUT,
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Issuer switch communication failed: card is inactive or validation timed out.",
        "error_reason": "card_inactive_timeout",
        "error_source": "bank",
        "error_step": "payment_authorization"
    },
    {
        "true_cause": CAUSE_INSUFFICIENT_FUNDS,
        "error_code": "GATEWAY_ERROR",
        "error_description": "Issuer bank returned processing error during automated mandate clearing cycle.",
        "error_reason": "gateway_decline",
        "error_source": "gateway",
        "error_step": "payment_authorization"
    },
    {
        "true_cause": CAUSE_INSUFFICIENT_FUNDS,
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Transaction exceeds permissible limit for customer account balance.",
        "error_reason": "limit_balance_confusion",
        "error_source": "bank",
        "error_step": "payment_authorization"
    },
    {
        "true_cause": CAUSE_EXPIRED_CARD,
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Card authentication failed during recurring debit validation.",
        "error_reason": "auth_failure",
        "error_source": "customer",
        "error_step": "payment_authentication"
    },
    {
        "true_cause": CAUSE_MANDATE_LIMIT_EXCEEDED,
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "Transaction could not be authorized under recurring payment parameters.",
        "error_reason": "parameter_error",
        "error_source": "bank",
        "error_step": "payment_authorization"
    }
]

def get_named_demo_scenarios() -> List[Dict[str, Any]]:
    """
    Returns the 5 mandatory, explicitly seeded demo scenarios.
    These are clean and unambiguous to guarantee reliable live judge demonstrations.
    """
    base_time = datetime.utcnow() - timedelta(hours=2)

    return [
        {
            "event_id": "demo_scenario_1_zero_click_insufficient_funds",
            "customer_ref": "cust_demo_aarav_01",
            "customer_name": "Aarav Sharma",
            "customer_phone": "+919811223344",
            "order_id": "order_demo_inflow_01",
            "payment_id": "pay_demo_fail_01",
            "subscription_id": "sub_pro_monthly_01",
            "amount": 1499.00,
            "currency": "INR",
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "Your payment has failed due to insufficient balance in your account.",
            "error_reason": "payment_failed_insufficient_funds",
            "error_source": "bank",
            "error_step": "payment_authorization",
            "card_last4": "4242",
            "card_network": "Visa",
            "issuer_bank": "HDFC",
            "attempt_count": 1,
            "ground_truth_cause": CAUSE_INSUFFICIENT_FUNDS,
            "detected_at": base_time.isoformat(),
            "expected_tier": 1,
            "expected_outcome": "recovered",
            "simulate_reply": None,
            "scenario_notes": "Scenario 1: Insufficient funds on monthly cycle -> Tier 1 zero-click smart retry succeeds without disturbing customer."
        },
        {
            "event_id": "demo_scenario_2_zero_click_timeout",
            "customer_ref": "cust_demo_priya_02",
            "customer_name": "Priya Patel",
            "customer_phone": "+919822334455",
            "order_id": "order_demo_switch_02",
            "payment_id": "pay_demo_fail_02",
            "subscription_id": "sub_enterprise_02",
            "amount": 4999.00,
            "currency": "INR",
            "error_code": "GATEWAY_ERROR",
            "error_description": "Gateway timed out while communicating with issuer bank switch.",
            "error_reason": "gateway_timeout",
            "error_source": "gateway",
            "error_step": "payment_authorization",
            "card_last4": "8888",
            "card_network": "MasterCard",
            "issuer_bank": "ICICI",
            "attempt_count": 1,
            "ground_truth_cause": CAUSE_BANK_TIMEOUT,
            "detected_at": (base_time + timedelta(minutes=10)).isoformat(),
            "expected_tier": 1,
            "expected_outcome": "recovered",
            "simulate_reply": None,
            "scenario_notes": "Scenario 2: Gateway/bank switch timeout -> Tier 1 zero-click smart retry with jitter succeeds seamlessly."
        },
        {
            "event_id": "demo_scenario_3_tier2_expired_card",
            "customer_ref": "cust_demo_rohan_03",
            "customer_name": "Rohan Verma",
            "customer_phone": "+919833445566",
            "order_id": "order_demo_card_03",
            "payment_id": "pay_demo_fail_03",
            "subscription_id": "sub_growth_03",
            "amount": 2499.00,
            "currency": "INR",
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "The card has expired or the expiration date is invalid.",
            "error_reason": "card_expired",
            "error_source": "customer",
            "error_step": "payment_authentication",
            "card_last4": "1111",
            "card_network": "Visa",
            "issuer_bank": "AXIS",
            "attempt_count": 1,
            "ground_truth_cause": CAUSE_EXPIRED_CARD,
            "detected_at": (base_time + timedelta(minutes=20)).isoformat(),
            "expected_tier": 2,
            "expected_outcome": "recovered",
            "simulate_reply": True,
            "scenario_notes": "Scenario 3: Expired card -> Tier 2 verified WhatsApp message sent with order ref & masked card. Customer replies YES -> recovered."
        },
        {
            "event_id": "demo_scenario_4_bounded_no_response",
            "customer_ref": "cust_demo_vikram_04",
            "customer_name": "Vikram Mehta",
            "customer_phone": "+919844556677",
            "order_id": "order_demo_mandate_04",
            "payment_id": "pay_demo_fail_04",
            "subscription_id": "sub_custom_tier_04",
            "amount": 18500.00,
            "currency": "INR",
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "The transaction amount exceeds the maximum permissible limit for this e-mandate.",
            "error_reason": "mandate_amount_limit_exceeded",
            "error_source": "bank",
            "error_step": "payment_authorization",
            "card_last4": "9999",
            "card_network": "RuPay",
            "issuer_bank": "SBIN",
            "attempt_count": 4,
            "ground_truth_cause": CAUSE_MANDATE_LIMIT_EXCEEDED,
            "detected_at": (base_time - timedelta(days=2)).isoformat(),
            "expected_tier": 2,
            "expected_outcome": "unrecovered",
            "simulate_reply": False,
            "scenario_notes": "Scenario 4: Mandate limit exceeded -> Tier 2 message sent, no response, stopping rule MAX_ATTEMPTS_EXCEEDED fires -> logged as unrecovered."
        },
        {
            "event_id": "demo_scenario_5_safety_refusal",
            "customer_ref": "cust_demo_flagged_05",
            "customer_name": "Flagged Entity",
            "customer_phone": "+919855667788",
            "order_id": "order_demo_risk_05",
            "payment_id": "pay_demo_fail_05",
            "subscription_id": "sub_suspicious_05",
            "amount": 9999.00,
            "currency": "INR",
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "Transaction declined by bank risk controls due to suspected fraud / card blocked by issuer.",
            "error_reason": "issuer_risk_decline",
            "error_source": "bank",
            "error_step": "payment_authorization",
            "card_last4": "0000",
            "card_network": "Visa",
            "issuer_bank": "HDFC",
            "attempt_count": 1,
            "ground_truth_cause": CAUSE_HARD_DECLINE_SUSPECTED_FRAUD,
            "detected_at": (base_time + timedelta(minutes=45)).isoformat(),
            "expected_tier": 3,
            "expected_outcome": "refused",
            "simulate_reply": None,
            "scenario_notes": "Scenario 5: Suspected fraud / flagged card -> Safety Gate fires, auto-retry refused, routed to Tier 3 human desk with explainable audit log."
        }
    ]

def generate_synthetic_batch(total_count: int = 75, inject_duplicates: bool = True) -> List[Dict[str, Any]]:
    """
    Generates realistic, noisy failed-transaction records with:
    - 5 named seeded scenarios
    - Realistic probability distribution
    - Deliberately ambiguous bank failure signals (~20% of batch)
    - Realistic dunning recovery outcomes (~35-45% net recovery, ~80-85% accuracy)
    - Intentional duplicate webhooks to test Idempotency Gate
    """
    seeded_scenarios = get_named_demo_scenarios()
    batch = list(seeded_scenarios)
    remaining_count = max(0, total_count - len(seeded_scenarios))

    cause_pool = (
        [CAUSE_INSUFFICIENT_FUNDS] * 42 +
        [CAUSE_BANK_TIMEOUT] * 28 +
        [CAUSE_EXPIRED_CARD] * 16 +
        [CAUSE_MANDATE_LIMIT_EXCEEDED] * 10 +
        [CAUSE_HARD_DECLINE_SUSPECTED_FRAUD] * 4
    )

    amounts = [499.00, 799.00, 999.00, 1499.00, 1999.00, 2499.00, 3999.00, 4999.00, 7999.00, 12500.00]

    for i in range(remaining_count):
        # 20% probability of an ambiguous/noisy rail signal
        is_noisy = (random.random() < 0.22)

        if is_noisy:
            noisy_item = random.choice(NOISY_TEMPLATES)
            cause = noisy_item["true_cause"]
            template = {
                "error_code": noisy_item["error_code"],
                "error_description": noisy_item["error_description"],
                "error_reason": noisy_item["error_reason"],
                "error_source": noisy_item["error_source"],
                "error_step": noisy_item["error_step"]
            }
        else:
            cause = random.choice(cause_pool)
            template = random.choice(CLEAR_TEMPLATES[cause])

        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        cust_name = f"{first_name} {last_name}"
        phone = f"+91{random.randint(7000000000, 9999999999)}"
        card_last4 = f"{random.randint(1000, 9999)}"
        amount = random.choice(amounts)
        if cause == CAUSE_MANDATE_LIMIT_EXCEEDED:
            amount = float(random.randint(16000, 45000))

        detected_time = datetime.utcnow() - timedelta(hours=random.randint(1, 72))
        
        # Realistic attempt distribution: some exceed retry limit, some are past SLA
        attempt = random.choices([1, 2, 3, 4], weights=[0.60, 0.20, 0.12, 0.08])[0]

        # Realistic customer reply rate for Tier 2 WhatsApp nudges (~40% reply YES, ~60% ignore/unresponsive)
        simulate_reply = None
        if cause in [CAUSE_EXPIRED_CARD, CAUSE_MANDATE_LIMIT_EXCEEDED]:
            simulate_reply = True if random.random() < 0.42 else False

        # Realistic Tier 1 bank retry recovery rate (~55% success, ~45% chronic low funds/switch failure)
        tier1_retry_success = True if random.random() < 0.55 else False

        record = {
            "event_id": f"evt_syn_{uuid.uuid4().hex[:10]}",
            "customer_ref": f"cust_{uuid.uuid4().hex[:8]}",
            "customer_name": cust_name,
            "customer_phone": phone,
            "order_id": f"order_{uuid.uuid4().hex[:12]}",
            "payment_id": f"pay_{uuid.uuid4().hex[:12]}",
            "subscription_id": f"sub_{uuid.uuid4().hex[:8]}",
            "amount": amount,
            "currency": "INR",
            "error_code": template["error_code"],
            "error_description": template["error_description"],
            "error_reason": template["error_reason"],
            "error_source": template["error_source"],
            "error_step": template["error_step"],
            "card_last4": card_last4,
            "card_network": random.choice(CARD_NETWORKS),
            "issuer_bank": random.choice(BANKS),
            "attempt_count": attempt,
            "ground_truth_cause": cause,
            "detected_at": detected_time.isoformat(),
            "simulate_reply": simulate_reply,
            "tier1_retry_success": tier1_retry_success
        }
        batch.append(record)

    # Inject 1 duplicate webhook event from generic pool to demonstrate Idempotency Gate
    if inject_duplicates and len(batch) > 10:
        dup1 = dict(batch[10])
        dup1["notes"] = "Intentional duplicate webhook retry #1"
        batch.append(dup1)

    return batch
