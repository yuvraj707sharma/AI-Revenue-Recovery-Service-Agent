'use client';

import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, TrendingUp, Radio } from 'lucide-react';
import { EvaluationReport, AnomalyItem } from '@/lib/api';

interface RevenueAndAnomaliesTabProps {
  report: EvaluationReport | null;
  anomalies: AnomalyItem[];
  loading: boolean;
}

export const RevenueAndAnomaliesTab: React.FC<RevenueAndAnomaliesTabProps> = ({
  report,
  anomalies,
  loading,
}) => {
  const atRiskAmount = report?.financials.amount_attempted || 0;
  const recoveredAmount = report?.financials.amount_recovered || 0;
  const recoveryRate = report?.financials.revenue_recovery_rate_pct || 0;
  const totalInvoices = report?.valid_events_count || 0;

  return (
    <div className="space-y-4">
      {/* 1. Plain-Language Merchant KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f]">
          <span className="text-[11px] text-[#888888] uppercase block mb-1">
            Subscription Revenue At Risk
          </span>
          <div className="text-2xl font-bold text-white tracking-tight">
            ₹{atRiskAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#666666] font-mono">
            Failed mandate invoices detected
          </span>
        </div>

        <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f]">
          <span className="text-[11px] text-[#888888] uppercase block mb-1">
            Recovered Automatically
          </span>
          <div className="text-2xl font-bold text-blue-400 tracking-tight">
            ₹{recoveredAmount.toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-[#666666] font-mono">
            Zero-click & verified actions
          </span>
        </div>

        <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f]">
          <span className="text-[11px] text-[#888888] uppercase block mb-1">
            Net Recovery Rate
          </span>
          <div className="text-2xl font-bold text-white tracking-tight">
            {recoveryRate.toFixed(1)}%
          </div>
          <span className="text-[10px] text-[#666666] font-mono">
            Real dunning baseline (35-45%)
          </span>
        </div>

        <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f]">
          <span className="text-[11px] text-[#888888] uppercase block mb-1">
            Double Charges Blocked
          </span>
          <div className="text-2xl font-bold text-white tracking-tight">
            {report?.idempotency_metrics.duplicate_blocked_count || 0}
          </div>
          <span className="text-[10px] text-[#666666] font-mono">
            Idempotency guarantees active
          </span>
        </div>
      </div>

      {/* 2. Anomaly Radar Panel (Cross-Merchant Real-Time Intelligence) */}
      <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Cross-Merchant Anomaly Radar
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#888888] px-2 py-0.5 rounded bg-[#111111] border border-[#222222]">
            Native Real-Time Feed
          </span>
        </div>

        <p className="text-xs text-[#888888]">
          Because Razorpay operates across thousands of merchants simultaneously, the Copilot detects issuer switch outages and card-rail degradations in real time—automatically holding retries before customers get spammed.
        </p>

        <div className="space-y-2.5 pt-1">
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              className={`p-3 rounded border text-xs ${
                anom.status === 'degraded'
                  ? 'bg-[#111111] border-blue-900/60 text-white'
                  : 'bg-[#0f0f0f] border-[#222222] text-[#cccccc]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{anom.bank}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1a1a1a] text-[#888888]">
                      {anom.rail}
                    </span>
                    {anom.status === 'degraded' && (
                      <span className="text-[10px] font-mono text-blue-400 font-bold">
                        +{anom.failure_spike_pct}% Failure Spike Across {anom.merchants_impacted} Merchants
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white">{anom.headline}</div>
                  <div className="text-[11px] text-[#888888] font-mono">
                    ↳ Action Taken: {anom.action_taken}
                  </div>
                </div>

                <span className="text-[10px] font-mono text-[#666666] shrink-0">
                  {anom.detected_at}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Recovery by Tier (Plain Merchant Language) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#888888]">Tier 1 — Zero-Click</span>
            <span className="text-[10px] font-mono text-blue-400">Silent Auto-Retry</span>
          </div>
          <div className="text-xl font-bold text-white">
            ₹{(report?.tier_breakdown?.['1']?.amount_recovered || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#888888]">
            Recovered silently via smart salary-credit windows (1st/5th/25th) and switch recovery delays. No message sent.
          </p>
        </div>

        <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#888888]">Tier 2 — Verified WhatsApp</span>
            <span className="text-[10px] font-mono text-blue-400">1-Tap "YES" Nudge</span>
          </div>
          <div className="text-xl font-bold text-white">
            ₹{(report?.tier_breakdown?.['2']?.amount_recovered || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#888888]">
            Recovered when cards expired or mandate limits were exceeded. Sent with merchant name & masked card (zero bare links).
          </p>
        </div>

        <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-[#888888]">Tier 3 — Safety Gate</span>
            <span className="text-[10px] font-mono text-[#888888]">Fraud Auto-Stops</span>
          </div>
          <div className="text-xl font-bold text-white">
            {report?.safety_gate?.total_refusals_logged || 0} Blocked
          </div>
          <p className="text-[11px] text-[#888888]">
            Suspected fraud and card-testing declines were blocked from auto-retries and routed directly to risk desk with audit logs.
          </p>
        </div>
      </div>
    </div>
  );
};
