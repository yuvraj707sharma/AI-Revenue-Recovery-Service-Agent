import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.database import AsyncSessionLocal, init_db
from app.generator.synthetic_batch import generate_synthetic_batch, get_named_demo_scenarios
from app.pipeline import (
    detect_failure,
    diagnose_root_cause,
    decide_intervention,
    evaluate_execution_bounds,
    execute_recovery_intervention,
    log_recovery_event,
    clear_recovery_events,
    get_all_recovery_events
)
from app.services.evaluation_service import evaluation_service

async def main():
    print("=" * 80)
    print("  RAZORPAY RECOVERY COPILOT (TRACK 3: AI REVENUE RECOVERY)")
    print("  Evaluation Benchmark & Ground-Truth Verification Report")
    print("=" * 80)

    await init_db()

    async with AsyncSessionLocal() as db:
        print("\n[1/4] Clearing previous audit records for fresh clean evaluation...")
        await clear_recovery_events(db)

        print("[2/4] Generating realistic noisy synthetic batch (75 Ingested Webhook Events)...")
        batch = generate_synthetic_batch(75, inject_duplicates=True)

        print(f"[3/4] Processing all {len(batch)} events through 6-stage autonomous recovery pipeline...")
        for i, item in enumerate(batch, 1):
            detected = detect_failure(item)
            diagnosis = diagnose_root_cause(detected)
            decision = decide_intervention(detected, diagnosis)
            bound_res = evaluate_execution_bounds(detected, diagnosis, decision)
            sim_reply = item.get("simulate_reply", None)

            execution = await execute_recovery_intervention(
                detected,
                diagnosis,
                decision,
                bound_res,
                simulate_customer_reply=sim_reply,
                enforce_idempotency=True
            )

            await log_recovery_event(
                db,
                detected,
                diagnosis,
                decision,
                bound_res,
                execution
            )

        print("[4/4] Computing honest evaluation metrics from MySQL audit logs...\n")
        report = await evaluation_service.generate_evaluation_report(db)
        events = await get_all_recovery_events(db, limit=100)

    # CLI Output formatting
    print("-" * 80)
    print("  HONEST RECOVERY BENCHMARK METRICS (Realistic Dunning Rail Signals)")
    print("-" * 80)
    print(f"  • Total Webhook Events Ingested: {report['total_events']}")
    print(f"  • Unique Invoices Evaluated    : {report['valid_events_count']}")
    print(f"  • Idempotency Gate Intercepts  : {report['idempotency_metrics']['duplicate_blocked_count']} Duplicate Double Charges Blocked")
    print(f"  • Diagnosis Accuracy           : {report['diagnosis_accuracy']}% ({report['correct_diagnoses']}/{report['valid_events_count']} Correct Unique Diagnoses)")
    print(f"  • Total Amount Attempted       : ₹{report['financials']['amount_attempted']:,.2f} across {report['valid_events_count']} invoices")
    print(f"  • Total Amount Recovered       : ₹{report['financials']['amount_recovered']:,.2f}")
    print(f"  • Net Recovery Rate            : {report['financials']['revenue_recovery_rate_pct']}% (Real dunning range: 35-45%)")
    print(f"  • False-Nudge Rate (Tier 2)    : {report['false_nudge_metrics']['false_nudge_rate_pct']}% ({report['false_nudge_metrics']['false_nudges_count']}/{report['false_nudge_metrics']['tier_2_total']} Tier 2 Messages)")
    print(f"  • Suspected Fraud Auto-Blocks  : {report['safety_gate']['total_refusals_logged']} Refusals Routed to Tier 3")
    print("-" * 80)

    print("\n" + "=" * 80)
    print("  CONFUSION MATRIX (Ground Truth vs. AI Predicted Root Cause)")
    print(f"  Total Matrix Count: {report['valid_events_count']} Unique Invoices")
    print("=" * 80)
    matrix = report['confusion_matrix']
    causes = list(matrix.keys())
    # Header row
    short_causes = [c.replace("hard_decline_", "").replace("mandate_", "")[:10] for c in causes]
    print(f"  {'ACTUAL \\ PRED':<22} | " + " | ".join(f"{c:<10}" for c in short_causes))
    print("  " + "-" * 76)
    for gt in causes:
        row_vals = [f"{matrix[gt].get(pred, 0):<10}" for pred in causes]
        print(f"  {gt[:22]:<22} | " + " | ".join(row_vals))

    print("\n" + "=" * 80)
    print("  TIER BREAKDOWN RECOVERY PERFORMANCE (Zero-Click-First Policy)")
    print("=" * 80)
    for tier_num, data in report['tier_breakdown'].items():
        print(f"  [{tier_num}] {data['name']}")
        print(f"      Invoices Attempted : {data['attempted']}")
        print(f"      Invoices Recovered : {data['recovered']} ({data.get('recovery_rate_pct', 0.0):.1f}%)")
        print(f"      ₹ Attempted        : ₹{data['amount_attempted']:,.2f}")
        print(f"      ₹ Recovered        : ₹{data['amount_recovered']:,.2f} ({data.get('revenue_recovery_rate_pct', 0.0):.1f}%)\n")

    print("=" * 80)
    print("  THE 5 MANDATORY NAMED DEMO SCENARIOS")
    print("=" * 80)
    named_ids = [s["event_id"] for s in get_named_demo_scenarios()]
    named_events = [e for e in events if e.event_id in named_ids]
    
    for ev in named_events:
        print(f"  Scenario ID   : {ev.event_id}")
        print(f"  Ground Truth  : {ev.ground_truth_cause}")
        print(f"  Predicted     : {ev.root_cause} (Match: {ev.ground_truth_cause == ev.root_cause})")
        print(f"  Tier Used     : Tier {ev.tier_used}")
        print(f"  IdempotencyKey: {ev.idempotency_key}")
        print(f"  Outcome       : {ev.outcome.upper()}")
        print(f"  Bound Rule    : {ev.bounded_by_rule or 'None (Passed)'}")
        print(f"  Amount        : ₹{ev.amount_attempted:,.2f} -> Recovered: ₹{ev.amount_recovered:,.2f}")
        print(f"  Reasoning     : {ev.decision_reasoning[:110]}...\n")

    print("=" * 80)
    print(f"  FULL UNFILTERED AUDIT TRAIL SAMPLE ({min(10, len(events))} of {len(events)} Events)")
    print("=" * 80)
    print(f"  {'EVENT ID':<22} | {'TIER':<4} | {'OUTCOME':<14} | {'IDEMPOTENCY KEY':<22} | {'₹ RECOVERED'}")
    print("  " + "-" * 76)
    for ev in events[:10]:
        print(f"  {ev.event_id[:22]:<22} | T{ev.tier_used:<3} | {ev.outcome:<14} | {str(ev.idempotency_key)[:22]:<22} | ₹{ev.amount_recovered:,.2f}")
    print("=" * 80)
    print("\nBenchmark completed successfully. All records persisted in database.")

if __name__ == "__main__":
    asyncio.run(main())
