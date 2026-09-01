'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { RecoveryEventItem } from '@/lib/api';

interface AuditTrailTableProps {
  events: RecoveryEventItem[];
  loading: boolean;
  onSelectEvent: (event: RecoveryEventItem) => void;
}

export const AuditTrailTable: React.FC<AuditTrailTableProps> = ({ events, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const filteredEvents = events.filter((ev) => {
    if (filterOutcome !== 'all' && ev.outcome !== filterOutcome) return false;
    if (filterTier !== 'all' && ev.tier_used?.toString() !== filterTier) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = ev.event_id.toLowerCase().includes(term);
      const matchCust = (ev.customer_ref || '').toLowerCase().includes(term);
      const matchCause = (ev.root_cause || '').toLowerCase().includes(term);
      const matchReasoning = (ev.decision_reasoning || '').toLowerCase().includes(term);
      return matchId || matchCust || matchCause || matchReasoning;
    }
    return true;
  });

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'recovered':
        return (
          <span className="font-mono text-[11px] font-bold text-blue-400">
            RECOVERED
          </span>
        );
      case 'refused':
        return (
          <span className="font-mono text-[11px] font-bold text-white bg-[#222222] px-1.5 py-0.5 rounded border border-[#333333]">
            REFUSED (SAFETY)
          </span>
        );
      case 'pending_response':
        return (
          <span className="font-mono text-[11px] text-[#888888]">
            AWAITING REPLY
          </span>
        );
      case 'unrecovered':
      default:
        return (
          <span className="font-mono text-[11px] text-[#666666]">
            UNRECOVERED
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#222222] p-4 rounded-lg space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span>MySQL Audit Trail (`recovery_events`)</span>
            <span className="text-[11px] font-mono text-[#888888]">
              [{filteredEvents.length}/{events.length}]
            </span>
          </h3>
          <p className="text-[11px] text-[#888888]">
            Complete uncherry-picked event logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#666666] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event ID, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 rounded bg-[#111111] border border-[#222222] text-xs text-white placeholder:text-[#555555] focus:outline-none focus:border-blue-500 w-48 sm:w-56 font-mono"
            />
          </div>

          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="px-2.5 py-1 rounded bg-[#111111] border border-[#222222] text-xs text-[#cccccc] focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="all">All Outcomes</option>
            <option value="recovered">Recovered</option>
            <option value="unrecovered">Unrecovered</option>
            <option value="refused">Refused (Safety)</option>
            <option value="pending_response">Awaiting Reply</option>
          </select>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-2.5 py-1 rounded bg-[#111111] border border-[#222222] text-xs text-[#cccccc] focus:outline-none focus:border-blue-500 font-mono"
          >
            <option value="all">All Tiers</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded border border-[#1f1f1f]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#111111] text-[#888888] uppercase text-[10px] font-mono border-b border-[#1f1f1f]">
            <tr>
              <th className="px-3 py-2.5">Event ID & Customer</th>
              <th className="px-3 py-2.5">Diagnosed Cause</th>
              <th className="px-3 py-2.5">Tier</th>
              <th className="px-3 py-2.5">Outcome</th>
              <th className="px-3 py-2.5">Bound / Rule</th>
              <th className="px-3 py-2.5 text-right">Attempted / Recovered</th>
              <th className="px-3 py-2.5 text-center">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#171717] font-mono text-[11px]">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#666666] font-sans">
                  No recovery events found.
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev) => {
                const isExpanded = expandedRow === ev.event_id;
                const isNamedDemo = ev.event_id.startsWith('demo_scenario_');

                return (
                  <React.Fragment key={ev.event_id}>
                    <tr className={`hover:bg-[#121212] transition-colors ${isNamedDemo ? 'bg-[#0b101b]' : ''}`}>
                      <td className="px-3 py-2.5">
                        <div className="text-white font-bold flex items-center gap-1.5">
                          <span>{ev.event_id}</span>
                          {isNamedDemo && (
                            <span className="text-[9px] px-1 rounded bg-blue-900/50 text-blue-300 border border-blue-700">
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#666666]">{ev.customer_ref}</div>
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="text-[#cccccc]">{ev.root_cause}</div>
                        <div className="text-[10px] text-[#666666]">GT: {ev.ground_truth_cause}</div>
                      </td>

                      <td className="px-3 py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#161616] text-blue-400 border border-[#2a2a2a] text-[10px]">
                          T{ev.tier_used}
                        </span>
                      </td>

                      <td className="px-3 py-2.5">
                        {getOutcomeBadge(ev.outcome)}
                      </td>

                      <td className="px-3 py-2.5 text-[#888888]">
                        {ev.bounded_by_rule || 'None'}
                      </td>

                      <td className="px-3 py-2.5 text-right font-bold">
                        <div className="text-white">₹{ev.amount_recovered?.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-[#666666] font-normal">Att: ₹{ev.amount_attempted?.toLocaleString('en-IN')}</div>
                      </td>

                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : ev.event_id)}
                          className="p-1 rounded bg-[#161616] hover:bg-[#222222] text-[#888888] hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Reasoning */}
                    {isExpanded && (
                      <tr className="bg-[#050505]">
                        <td colSpan={7} className="px-4 py-3 text-xs font-mono border-b border-[#1f1f1f] space-y-2">
                          <div className="p-3 rounded bg-[#0a0a0a] border border-[#222222] space-y-1.5">
                            <span className="text-[10px] uppercase text-[#666666] block font-bold">
                              Reasoning & Action Trace:
                            </span>
                            <p className="text-white leading-relaxed text-[11px]">
                              {ev.decision_reasoning}
                            </p>
                            <div className="pt-1 text-[10px] text-blue-400">
                              Action Taken: {ev.action_taken}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
