'use client';

import React, { useState } from 'react';
import { Play, RotateCcw, MessageSquare, Check, ArrowRight, ShieldAlert, Clock, CreditCard, Sparkles } from 'lucide-react';
import { DemoScenarioItem, RecoveryEventItem, PipelineTraceResponse } from '@/lib/api';

interface AgentActivityTabProps {
  scenarios: DemoScenarioItem[];
  events: RecoveryEventItem[];
  onRunScenario: (scenarioId: string) => Promise<void>;
  onRunBatch: (count?: number) => Promise<void>;
  onClearLogs: () => Promise<void>;
  onOpenWhatsApp: () => void;
  isProcessing: boolean;
  activeScenario: string | null;
  lastTrace: PipelineTraceResponse | null;
}

export const AgentActivityTab: React.FC<AgentActivityTabProps> = ({
  scenarios,
  events,
  onRunScenario,
  onRunBatch,
  onClearLogs,
  onOpenWhatsApp,
  isProcessing,
  activeScenario,
  lastTrace,
}) => {
  return (
    <div className="space-y-4">
      {/* 1. Header with Demo Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Agent Actions & 8 Named Demo Scenarios
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Enterprise Suite
            </span>
          </div>
          <p className="text-[11px] text-[#888888] mt-0.5">
            Click any scenario below to trigger a live execution through the 6-stage recovery pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161616] hover:bg-[#202020] text-blue-400 text-xs border border-[#2a2a2a] transition-colors font-mono"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Preview</span>
          </button>

          <button
            onClick={() => onRunBatch(75)}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#1a1a1a] hover:bg-[#252525] text-white text-xs font-medium border border-[#333333] transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run 75 Batch</span>
          </button>

          <button
            onClick={() => onRunBatch(250)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run 250 Batch (Enterprise)</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={isProcessing}
            className="p-1.5 rounded bg-[#161616] hover:bg-[#202020] text-[#888888] hover:text-white border border-[#222222] transition-colors"
            title="Reset Audit Logs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. The 8 Named Demo Scenarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {scenarios.map((sc, idx) => {
          const isSelected = activeScenario === sc.event_id;
          return (
            <div
              key={sc.event_id}
              onClick={() => !isProcessing && onRunScenario(sc.event_id)}
              className={`p-3 rounded border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#111111] border-blue-500 shadow-md ring-1 ring-blue-500'
                  : 'bg-[#0a0a0a] border-[#1f1f1f] hover:border-[#333333] hover:bg-[#0e0e0e]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono text-[#888888]">Demo #{idx + 1}</span>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  sc.expected_tier === 1 ? 'text-white bg-[#1a1a1a]' : sc.expected_tier === 2 ? 'text-blue-400 bg-[#162033]' : 'text-[#aaaaaa] bg-[#222222]'
                }`}>
                  Tier {sc.expected_tier}
                </span>
              </div>

              <div className="text-xs font-bold text-white mb-1 line-clamp-1">
                {sc.ground_truth_cause.replace(/_/g, ' ').toUpperCase()}
              </div>

              <div className="text-[11px] font-mono text-blue-400 mb-2">
                ₹{sc.amount.toLocaleString('en-IN')} • {sc.issuer_bank}
              </div>

              <p className="text-[11px] text-[#777777] line-clamp-2 leading-tight mb-2.5">
                {sc.scenario_notes}
              </p>

              <button
                disabled={isProcessing}
                className="w-full py-1 text-[11px] font-mono rounded bg-[#161616] hover:bg-blue-600 text-white transition-colors text-center"
              >
                Run Scenario →
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Live Execution Result Trace (if scenario executed) */}
      {lastTrace && (
        <div className="p-4 rounded bg-[#0e0e0e] border border-blue-900/50 shadow-lg space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-[#222222] pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <h4 className="font-bold text-white uppercase tracking-wider">
                Execution Result: {lastTrace.scenario_id.toUpperCase()}
              </h4>
            </div>
            <span className="text-[11px] text-[#888888]">
              Idempotency Key: <code className="text-blue-400">{lastTrace.trace['5_execute'].idempotency_key}</code>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-2.5 rounded bg-[#141414] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Diagnosis</span>
              <div className="font-bold text-white">{lastTrace.trace['2_diagnose'].root_cause}</div>
              <span className="text-[10px] text-[#666666]">
                Confidence: {(lastTrace.trace['2_diagnose'].confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#141414] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Intervention Policy</span>
              <div className="font-bold text-blue-400">
                Tier {lastTrace.trace['3_decide'].tier} — {lastTrace.trace['3_decide'].channel}
              </div>
              <span className="text-[10px] text-[#666666]">
                {lastTrace.trace['3_decide'].action_type}
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#141414] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Execution Outcome</span>
              <div className="font-bold text-white uppercase">
                {lastTrace.trace['5_execute'].outcome}
              </div>
              <span className="text-[10px] text-[#666666]">
                Recovered: ₹{lastTrace.trace['5_execute'].amount_recovered || 0}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#0a0a0a] border border-[#222222] text-[11px] text-[#aaaaaa] leading-relaxed">
            <strong className="text-white">Reasoning:</strong> {lastTrace.trace['2_diagnose'].evidence} | {lastTrace.trace['3_decide'].reasoning}
            {lastTrace.trace['4_bound'].rule_name && (
              <span className="text-blue-400 block mt-1">
                [{lastTrace.trace['4_bound'].rule_name}] {lastTrace.trace['4_bound'].explanation}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. Real-time Activity Feed */}
      <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            Recent Copilot Activity Feed
          </h4>
          <span className="text-[10px] font-mono text-[#888888]">
            Showing {Math.min(events.length, 30)} of {events.length} records
          </span>
        </div>

        <div className="divide-y divide-[#1a1a1a] max-h-96 overflow-y-auto font-mono text-xs">
          {events.length === 0 ? (
            <div className="p-6 text-center text-[#666666]">
              No recovery records yet. Run a demo scenario or click "Run 250 Batch" above.
            </div>
          ) : (
            events.slice(0, 30).map((ev) => (
              <div key={ev.event_id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-[#111111] px-2 rounded">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      ev.outcome === 'recovered'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : ev.outcome === 'duplicate_blocked'
                        ? 'bg-[#1c1c1c] text-[#888888] border border-[#333333]'
                        : 'bg-[#1a1a1a] text-[#888888]'
                    }`}>
                      {ev.outcome}
                    </span>
                    <span className="text-white font-bold">{ev.customer_ref}</span>
                    <span className="text-[10px] text-[#666666]">Tier {ev.tier_used || 1}</span>
                  </div>
                  <p className="text-[11px] text-[#888888] truncate max-w-xl">
                    {ev.decision_reasoning}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-bold text-white">
                    {ev.outcome === 'recovered' ? `₹${ev.amount_recovered.toLocaleString('en-IN')}` : '₹0'}
                  </div>
                  <span className="text-[9px] text-[#666666]">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
