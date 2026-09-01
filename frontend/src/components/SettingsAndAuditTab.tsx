'use client';

import React, { useState } from 'react';
import { Settings, Shield, Sliders, Check, Search, Download } from 'lucide-react';
import { MerchantPolicy, RecoveryEventItem, updateMerchantPolicy } from '@/lib/api';

interface SettingsAndAuditTabProps {
  policy: MerchantPolicy;
  events: RecoveryEventItem[];
  onPolicyChange: (newPolicy: MerchantPolicy) => void;
  onRefreshEvents: () => void;
  loading: boolean;
}

export const SettingsAndAuditTab: React.FC<SettingsAndAuditTabProps> = ({
  policy,
  events,
  onPolicyChange,
  onRefreshEvents,
  loading,
}) => {
  const [currentPolicy, setCurrentPolicy] = useState<MerchantPolicy>(policy);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');

  const handleSavePolicy = async () => {
    setSaving(true);
    const res = await updateMerchantPolicy(currentPolicy);
    setSaving(false);
    if (res.success) {
      onPolicyChange(res.policy);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (outcomeFilter !== 'ALL' && ev.outcome !== outcomeFilter.toLowerCase()) return false;
    if (tierFilter !== 'ALL' && ev.tier_used?.toString() !== tierFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        ev.event_id.toLowerCase().includes(q) ||
        ev.customer_ref.toLowerCase().includes(q) ||
        (ev.idempotency_key && ev.idempotency_key.toLowerCase().includes(q)) ||
        (ev.decision_reasoning && ev.decision_reasoning.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 1. Merchant Policy Controls */}
      <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Merchant Recovery Policy & Brand Controls</span>
            </h3>
            <p className="text-[11px] text-[#888888]">
              Configure autonomy guardrails, retry aggression, and message tone for your business.
            </p>
          </div>

          <button
            onClick={handleSavePolicy}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
            <span>{savedSuccess ? 'Policy Saved!' : saving ? 'Saving...' : 'Save Policy'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          {/* Autonomy Mode */}
          <div className="p-3 rounded bg-[#111111] border border-[#222222] space-y-2">
            <span className="text-[10px] uppercase text-[#888888] block">Autonomy Level</span>
            <select
              value={currentPolicy.execution_mode}
              onChange={(e) => setCurrentPolicy({ ...currentPolicy, execution_mode: e.target.value as any })}
              className="w-full bg-[#000000] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
            >
              <option value="autonomous">Full Autopilot (Zero-Click First)</option>
              <option value="approval_required">Approval Required (Tier 2/3)</option>
            </select>
            <p className="text-[10px] text-[#666666]">
              Autopilot resolves Tier 1 and dispatches verified Tier 2 automatically.
            </p>
          </div>

          {/* Max Retry Cap */}
          <div className="p-3 rounded bg-[#111111] border border-[#222222] space-y-2">
            <span className="text-[10px] uppercase text-[#888888] block">Max Retry Attempts</span>
            <select
              value={currentPolicy.max_retry_attempts}
              onChange={(e) => setCurrentPolicy({ ...currentPolicy, max_retry_attempts: parseInt(e.target.value) })}
              className="w-full bg-[#000000] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
            >
              <option value={1}>1 Attempt (Ultra-Conservative)</option>
              <option value={2}>2 Attempts (Moderate)</option>
              <option value={3}>3 Attempts (Default / Recommended)</option>
            </select>
            <p className="text-[10px] text-[#666666]">
              Hard bounds halt further attempts after this limit.
            </p>
          </div>

          {/* Message Tone */}
          <div className="p-3 rounded bg-[#111111] border border-[#222222] space-y-2">
            <span className="text-[10px] uppercase text-[#888888] block">WhatsApp Tone of Voice</span>
            <select
              value={currentPolicy.message_tone}
              onChange={(e) => setCurrentPolicy({ ...currentPolicy, message_tone: e.target.value as any })}
              className="w-full bg-[#000000] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
            >
              <option value="english">Professional English</option>
              <option value="hinglish">Conversational Hinglish (India-Native)</option>
            </select>
            <p className="text-[10px] text-[#666666]">
              Hinglish tone boosts Tier 2 reply rates in regional Indian markets.
            </p>
          </div>

          {/* Outage Radar Auto-Pause */}
          <div className="p-3 rounded bg-[#111111] border border-[#222222] space-y-2">
            <span className="text-[10px] uppercase text-[#888888] block">Bank Outage Auto-Hold</span>
            <select
              value={currentPolicy.auto_pause_on_outage ? 'true' : 'false'}
              onChange={(e) => setCurrentPolicy({ ...currentPolicy, auto_pause_on_outage: e.target.value === 'true' })}
              className="w-full bg-[#000000] border border-[#333333] rounded px-2 py-1 text-white text-xs outline-none focus:border-blue-500"
            >
              <option value="true">Enabled (Auto-Hold During Outages)</option>
              <option value="false">Disabled (Proceed Regardless)</option>
            </select>
            <p className="text-[10px] text-[#666666]">
              Pauses retries during cross-merchant bank switch degradation.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Full Audit Trail & Idempotency Compliance Ledger */}
      <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Compliance & Idempotency Audit Trail
            </h3>
            <p className="text-[11px] text-[#888888]">
              Immutable MySQL ledger with idempotency keys, rule attribution, and double-charge prevention logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search event, customer, idempotency key..."
                className="bg-[#111111] border border-[#222222] rounded pl-7 pr-2.5 py-1 text-xs text-white placeholder-[#555555] font-mono outline-none focus:border-blue-500 w-56"
              />
            </div>

            {/* Outcome Filter */}
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-[#111111] border border-[#222222] rounded px-2 py-1 text-xs text-white font-mono outline-none"
            >
              <option value="ALL">All Outcomes</option>
              <option value="RECOVERED">Recovered</option>
              <option value="UNRECOVERED">Unrecovered</option>
              <option value="REFUSED">Refused (Safety Gate)</option>
              <option value="DUPLICATE_BLOCKED">Duplicate Blocked</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded border border-[#1f1f1f]">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#111111] text-[#888888] uppercase text-[10px] border-b border-[#222222]">
              <tr>
                <th className="px-3 py-2.5">Event ID</th>
                <th className="px-3 py-2.5">Customer Ref</th>
                <th className="px-3 py-2.5">Tier</th>
                <th className="px-3 py-2.5">Idempotency Key</th>
                <th className="px-3 py-2.5">Outcome</th>
                <th className="px-3 py-2.5">Bound / Rule</th>
                <th className="px-3 py-2.5 text-right">Attempted</th>
                <th className="px-3 py-2.5 text-right">Recovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161616]">
              {filteredEvents.map((ev) => (
                <tr key={ev.event_id} className="hover:bg-[#111111]/60 transition-colors">
                  <td className="px-3 py-2 text-white font-bold">{ev.event_id.slice(0, 18)}</td>
                  <td className="px-3 py-2 text-[#888888]">{ev.customer_ref}</td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.2 rounded bg-[#161616] text-white text-[10px]">
                      T{ev.tier_used || 1}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-blue-400 text-[11px]">{ev.idempotency_key || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      ev.outcome === 'recovered'
                        ? 'bg-blue-900/40 text-blue-400'
                        : ev.outcome === 'duplicate_blocked'
                        ? 'bg-[#222222] text-[#888888]'
                        : ev.outcome === 'refused'
                        ? 'bg-[#1a1a1a] text-white'
                        : 'bg-[#161616] text-[#666666]'
                    }`}>
                      {ev.outcome.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[#777777] text-[10px]">{ev.bounded_by_rule || 'NONE'}</td>
                  <td className="px-3 py-2 text-right text-[#aaaaaa]">₹{ev.amount_attempted.toLocaleString('en-IN')}</td>
                  <td className="px-3 py-2 text-right text-white font-bold">
                    {ev.amount_recovered > 0 ? `₹${ev.amount_recovered.toLocaleString('en-IN')}` : '₹0'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
