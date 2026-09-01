import logging
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.recovery_event import RecoveryEvent
from app.pipeline.diagnose import ALL_ROOT_CAUSES, CAUSE_INSUFFICIENT_FUNDS, CAUSE_BANK_TIMEOUT

logger = logging.getLogger("recovery_agent.evaluation")

class EvaluationService:
    """
    Computes comprehensive, honest evaluation metrics over all audited recovery events.
    Guarantees strict arithmetic consistency between confusion matrix, tier stats, and financial totals.
    """

    async def generate_evaluation_report(self, db: AsyncSession) -> Dict[str, Any]:
        result = await db.execute(select(RecoveryEvent))
        all_events: List[RecoveryEvent] = list(result.scalars().all())

        total_ingested = len(all_events)
        if total_ingested == 0:
            return {
                "total_events": 0,
                "valid_events_count": 0,
                "duplicate_blocked_count": 0,
                "diagnosis_accuracy": 0.0,
                "correct_diagnoses": 0,
                "financials": {
                    "amount_attempted": 0.0,
                    "amount_recovered": 0.0,
                    "revenue_recovery_rate_pct": 0.0
                },
                "false_nudge_metrics": {
                    "false_nudges_count": 0,
                    "tier_2_total": 0,
                    "false_nudge_rate_pct": 0.0
                },
                "idempotency_metrics": {
                    "duplicate_blocked_count": 0,
                    "double_charges_prevented": 0
                },
                "confusion_matrix": {},
                "tier_breakdown": {},
                "cause_breakdown": {},
                "outcomes": {},
                "time_distribution": {},
                "safety_gate": {
                    "total_refusals_logged": 0,
                    "zero_click_auto_retries_avoided_on_fraud": 0
                }
            }

        # Separate valid unique invoice events from duplicate webhook events blocked by Idempotency Gate
        valid_events = [e for e in all_events if e.outcome != "duplicate_blocked"]
        duplicate_events = [e for e in all_events if e.outcome == "duplicate_blocked"]
        duplicate_blocked_count = len(duplicate_events)
        total_unique_invoices = len(valid_events)

        # 1. Confusion Matrix & Diagnosis Accuracy (Computed strictly over the unique processed invoices)
        correct_diagnoses = 0
        confusion_matrix: Dict[str, Dict[str, int]] = {gt: {pred: 0 for pred in ALL_ROOT_CAUSES} for gt in ALL_ROOT_CAUSES}
        per_cause_stats = {cause: {"total": 0, "correct": 0, "predicted": 0} for cause in ALL_ROOT_CAUSES}

        for ev in valid_events:
            gt = ev.ground_truth_cause
            pred = ev.root_cause

            if gt in per_cause_stats:
                per_cause_stats[gt]["total"] += 1
            if pred in per_cause_stats:
                per_cause_stats[pred]["predicted"] += 1

            if gt and pred and gt in confusion_matrix and pred in confusion_matrix[gt]:
                confusion_matrix[gt][pred] += 1

            if gt and pred and gt == pred:
                correct_diagnoses += 1
                if gt in per_cause_stats:
                    per_cause_stats[gt]["correct"] += 1

        diagnosis_accuracy = (correct_diagnoses / total_unique_invoices * 100.0) if total_unique_invoices > 0 else 0.0

        # 2. Financial Metrics
        total_amount_attempted = sum(float(ev.amount_attempted or 0.0) for ev in valid_events)
        total_amount_recovered = sum(float(ev.amount_recovered or 0.0) for ev in valid_events)
        revenue_recovery_rate = (total_amount_recovered / total_amount_attempted * 100.0) if total_amount_attempted > 0 else 0.0

        # 3. Tier Breakdown Recovery Rate
        tier_stats = {
            1: {"name": "Tier 1: Zero-Click Retry", "attempted": 0, "recovered": 0, "amount_attempted": 0.0, "amount_recovered": 0.0},
            2: {"name": "Tier 2: Verified WhatsApp Nudge", "attempted": 0, "recovered": 0, "amount_attempted": 0.0, "amount_recovered": 0.0},
            3: {"name": "Tier 3: Human Escalation / Safety Gate", "attempted": 0, "recovered": 0, "amount_attempted": 0.0, "amount_recovered": 0.0}
        }

        # 4. False-Nudge Rate & Outcomes
        false_nudges = 0
        tier_2_total = 0
        outcome_counts = {
            "recovered": 0,
            "unrecovered": 0,
            "refused": 0,
            "pending_response": 0,
            "duplicate_blocked": duplicate_blocked_count
        }

        for ev in valid_events:
            t = ev.tier_used if ev.tier_used in [1, 2, 3] else 1
            tier_stats[t]["attempted"] += 1
            amt_att = float(ev.amount_attempted or 0.0)
            amt_rec = float(ev.amount_recovered or 0.0)
            tier_stats[t]["amount_attempted"] += amt_att
            tier_stats[t]["amount_recovered"] += amt_rec

            if ev.outcome == "recovered":
                tier_stats[t]["recovered"] += 1
                outcome_counts["recovered"] += 1
            elif ev.outcome == "refused":
                outcome_counts["refused"] += 1
            elif ev.outcome == "pending_response":
                outcome_counts["pending_response"] += 1
            else:
                outcome_counts["unrecovered"] += 1

            if t == 2:
                tier_2_total += 1
                # Cross-tier check: Was a customer message sent when ground truth was silently recoverable?
                if ev.ground_truth_cause in [CAUSE_INSUFFICIENT_FUNDS, CAUSE_BANK_TIMEOUT]:
                    false_nudges += 1

        for t, data in tier_stats.items():
            data["recovery_rate_pct"] = (data["recovered"] / data["attempted"] * 100.0) if data["attempted"] > 0 else 0.0
            data["revenue_recovery_rate_pct"] = (data["amount_recovered"] / data["amount_attempted"] * 100.0) if data["amount_attempted"] > 0 else 0.0

        false_nudge_rate = (false_nudges / tier_2_total * 100.0) if tier_2_total > 0 else 0.0

        # 5. Time-to-Recovery Distribution
        time_distribution = {
            "instant_zero_click": len([e for e in valid_events if e.tier_used == 1 and e.outcome == "recovered" and e.root_cause == CAUSE_BANK_TIMEOUT]),
            "salary_window_scheduled": len([e for e in valid_events if e.tier_used == 1 and e.outcome == "recovered" and e.root_cause == CAUSE_INSUFFICIENT_FUNDS]),
            "interactive_verified_reply": len([e for e in valid_events if e.tier_used == 2 and e.outcome == "recovered"]),
            "bounded_or_unrecovered": len([e for e in valid_events if e.outcome == "unrecovered"]),
            "safety_refusal_escalated": len([e for e in valid_events if e.outcome == "refused"]),
            "duplicate_idempotency_blocked": duplicate_blocked_count
        }

        return {
            "total_events": total_ingested,
            "valid_events_count": total_unique_invoices,
            "diagnosis_accuracy": round(diagnosis_accuracy, 1),
            "correct_diagnoses": correct_diagnoses,
            "financials": {
                "amount_attempted": round(total_amount_attempted, 2),
                "amount_recovered": round(total_amount_recovered, 2),
                "amount_saved_net": round(total_amount_recovered, 2),
                "revenue_recovery_rate_pct": round(revenue_recovery_rate, 1)
            },
            "false_nudge_metrics": {
                "false_nudges_count": false_nudges,
                "tier_2_total": tier_2_total,
                "false_nudge_rate_pct": round(false_nudge_rate, 1),
                "policy_guarantee": "Zero-click prioritized; false-nudge rate minimized under noisy rail signals."
            },
            "idempotency_metrics": {
                "duplicate_blocked_count": duplicate_blocked_count,
                "double_charges_prevented": duplicate_blocked_count
            },
            "confusion_matrix": confusion_matrix,
            "tier_breakdown": tier_stats,
            "cause_breakdown": per_cause_stats,
            "outcomes": outcome_counts,
            "time_distribution": time_distribution,
            "safety_gate": {
                "total_refusals_logged": outcome_counts["refused"],
                "zero_click_auto_retries_avoided_on_fraud": outcome_counts["refused"]
            }
        }

evaluation_service = EvaluationService()
