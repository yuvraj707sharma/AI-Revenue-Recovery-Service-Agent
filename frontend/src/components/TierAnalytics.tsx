'use client';

import React from 'react';
import { EvaluationReport } from '@/lib/api';

interface TierAnalyticsProps {
  report: EvaluationReport | null;
}

export const TierAnalytics: React.FC<TierAnalyticsProps> = ({ report }) => {
  const tier1 = report?.tier_breakdown?.[1];
  const tier2 = report?.tier_breakdown?.[2];
  const tier3 = report?.tier_breakdown?.[3];

  const t1Rate = tier1?.attempted ? ((tier1.recovered / tier1.attempted) * 100).toFixed(1) : '0.0';
  const t2Rate = tier2?.attempted ? ((tier2.recovered / tier2.attempted) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      {/* Tier 1 */}
      <div className="bg-[#0a0a0a] border border-[#222222] p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tier 1: Zero-Click Backend</h4>
            <p className="text-[11px] text-[#888888]">Silent retry without user contact</p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400">
            {t1Rate}%
          </span>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#1a1a1a] text-xs">
          <div className="flex justify-between text-[#888888]">
            <span>Events Attempted:</span>
            <span className="font-mono text-white">{tier1?.attempted || 0}</span>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Silently Recovered:</span>
            <span className="font-mono text-white">{tier1?.recovered || 0}</span>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Amount Recovered:</span>
            <span className="font-mono text-blue-400 font-bold">₹{(tier1?.amount_recovered || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#111111] border border-[#1a1a1a] text-[11px] text-[#888888]">
          <strong className="text-white">Active Windows:</strong> Salary credit (1st/5th/25th 10:00 AM IST) & Bank jitter delay (15 min).
        </div>
      </div>

      {/* Tier 2 */}
      <div className="bg-[#0a0a0a] border border-[#222222] p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tier 2: Verified WhatsApp</h4>
            <p className="text-[11px] text-[#888888]">Self-verifying anti-phishing nudge</p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-400">
            {t2Rate}%
          </span>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#1a1a1a] text-xs">
          <div className="flex justify-between text-[#888888]">
            <span>Nudges Dispatched:</span>
            <span className="font-mono text-white">{tier2?.attempted || 0}</span>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Recovered via "YES":</span>
            <span className="font-mono text-white">{tier2?.recovered || 0}</span>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Amount Recovered:</span>
            <span className="font-mono text-blue-400 font-bold">₹{(tier2?.amount_recovered || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#111111] border border-[#1a1a1a] text-[11px] text-[#888888]">
          <strong className="text-white">Security Rule:</strong> Masked card + order ID. Bare/shortened links strictly prohibited.
        </div>
      </div>

      {/* Tier 3 */}
      <div className="bg-[#0a0a0a] border border-[#222222] p-4 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Tier 3: Human Escalation</h4>
            <p className="text-[11px] text-[#888888]">Fraud safety gate & exhausted limits</p>
          </div>
          <span className="text-xs font-mono font-bold text-[#888888]">
            {tier3?.attempted || 0} Cases
          </span>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-[#1a1a1a] text-xs">
          <div className="flex justify-between text-[#888888]">
            <span>Suspected Fraud Blocks:</span>
            <span className="font-mono text-white">{report?.safety_gate?.total_refusals_logged || 0}</span>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Stopping Rule Halts:</span>
            <span className="font-mono text-white">{report?.outcomes?.unrecovered || 0}</span>
          </div>
          <div className="flex justify-between text-[#888888]">
            <span>Awaiting Customer Reply:</span>
            <span className="font-mono text-white">{report?.outcomes?.pending_response || 0}</span>
          </div>
        </div>

        <div className="p-2.5 rounded bg-[#111111] border border-[#1a1a1a] text-[11px] text-[#888888]">
          <strong className="text-white">Safety Policy:</strong> Immediate auto-retry refusal on fraud flags + Max 3 attempts cap.
        </div>
      </div>
    </div>
  );
};
