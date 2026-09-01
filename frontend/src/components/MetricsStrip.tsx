'use client';

import React from 'react';
import { EvaluationReport } from '@/lib/api';

interface MetricsStripProps {
  report: EvaluationReport | null;
  loading: boolean;
}

export const MetricsStrip: React.FC<MetricsStripProps> = ({ report, loading }) => {
  const amountAttempted = report?.financials?.amount_attempted || 0;
  const amountRecovered = report?.financials?.amount_recovered || 0;
  const revenueRate = report?.financials?.revenue_recovery_rate_pct || 0;
  const accuracy = report?.diagnosis_accuracy || 0;
  const correctCount = report?.correct_diagnoses || 0;
  const totalEvents = report?.total_events || 0;
  const falseNudgeRate = report?.false_nudge_metrics?.false_nudge_rate_pct || 0;
  
  const tier1Attempted = report?.tier_breakdown?.[1]?.attempted || 0;
  const tier1Recovered = report?.tier_breakdown?.[1]?.recovered || 0;
  const tier1Rate = tier1Attempted > 0 ? ((tier1Recovered / tier1Attempted) * 100).toFixed(1) : '0.0';

  const fraudRefusals = report?.safety_gate?.total_refusals_logged || 0;

  const kpis = [
    {
      label: 'Revenue Recovered',
      value: `₹${amountRecovered.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: `${revenueRate}% of ₹${amountAttempted.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      highlight: true,
    },
    {
      label: 'Diagnosis Accuracy',
      value: `${accuracy}%`,
      sub: `${correctCount}/${totalEvents} Ground Truth Verified`,
      highlight: false,
    },
    {
      label: 'Tier 1 Zero-Click Rate',
      value: `${tier1Rate}%`,
      sub: `${tier1Recovered}/${tier1Attempted} Recovered Silently`,
      highlight: false,
    },
    {
      label: 'False-Nudge Rate',
      value: `${falseNudgeRate}%`,
      sub: 'Zero Unsolicited Messages',
      highlight: false,
    },
    {
      label: 'Safety Gate Refusals',
      value: `${fraudRefusals}`,
      sub: 'Fraud Auto-Retries Blocked',
      highlight: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {kpis.map((kpi, idx) => (
        <div
          key={idx}
          className="bg-[#0a0a0a] border border-[#222222] p-4 rounded-lg flex flex-col justify-between"
        >
          <div className="text-[11px] uppercase tracking-wider text-[#888888] font-medium mb-1">
            {kpi.label}
          </div>
          <div className={`text-2xl font-bold tracking-tight my-1 ${kpi.highlight ? 'text-blue-400' : 'text-white'}`}>
            {kpi.value}
          </div>
          <div className="text-[11px] text-[#666666] font-mono mt-1 pt-2 border-t border-[#1a1a1a]">
            {kpi.sub}
          </div>
        </div>
      ))}
    </div>
  );
};
