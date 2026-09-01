'use client';

import React from 'react';
import { ShieldCheck, AlertCircle, CheckCircle2, TrendingUp, Radio } from 'lucide-react';
import { EvaluationReport, AnomalyItem, AnalyticsTrends } from '@/lib/api';
import { VisualAnalyticsCharts } from './VisualAnalyticsCharts';

interface RevenueAndAnomaliesTabProps {
  report: EvaluationReport | null;
  anomalies: AnomalyItem[];
  trends?: AnalyticsTrends;
  loading: boolean;
}

export const RevenueAndAnomaliesTab: React.FC<RevenueAndAnomaliesTabProps> = ({
  report,
  anomalies,
  trends,
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

      {/* 2. Visual Recovery Analytics & Bank-Wise Health Charts */}
      <VisualAnalyticsCharts trends={trends} />

      {/* 3. Cross-Merchant Anomaly Radar Panel */}
      <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Cross-Merchant Anomaly Radar
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] text-[#888888] border border-[#2a2a2a]">
            Native Real-Time Feed
          </span>
        </div>

        <p className="text-xs text-[#888888] leading-relaxed">
          Because Razorpay operates across thousands of merchants simultaneously, the Copilot detects issuer switch outages and card-rail degradations in real time—automatically holding retries before customers get spammed.
        </p>

        <div className="space-y-2 pt-1">
          {anomalies.map((anom) => (
            <div
              key={anom.id}
              className={`p-3 rounded border text-xs ${
                anom.status === 'degraded'
                  ? 'bg-[#121212] border-blue-900/40'
                  : 'bg-[#0f0f0f] border-[#222222]'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase">{anom.bank}</span>
                    <span className="text-[10px] font-mono text-[#888888]">
                      {anom.rail}
                    </span>
                    {anom.status === 'degraded' ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        +{anom.failure_spike_pct}% Failure Spike Across {anom.merchants_impacted} Merchants
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1c1c1c] text-[#888888]">
                        Optimal Clearing
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#cccccc] font-mono">{anom.headline}</p>

                  <div className="flex items-center gap-1.5 text-[11px] text-blue-400 font-mono">
                    <span>↳ Action Taken:</span>
                    <span>{anom.action_taken}</span>
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

      {/* 4. Recovery by Tier (Plain Merchant Language) */}
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
