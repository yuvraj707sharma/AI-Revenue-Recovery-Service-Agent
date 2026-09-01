'use client';

import React, { useState } from 'react';
import { Play, RotateCcw, MessageSquare, Check, ArrowRight, ShieldAlert, Clock, CreditCard } from 'lucide-react';
import { DemoScenarioItem, RecoveryEventItem, PipelineTraceResponse } from '@/lib/api';

interface AgentActivityTabProps {
  scenarios: DemoScenarioItem[];
  events: RecoveryEventItem[];
  onRunScenario: (scenarioId: string) => Promise<void>;
  onRunBatch: () => Promise<void>;
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Agent Actions & Named Demo Scenarios
          </h3>
          <p className="text-[11px] text-[#888888]">
            Click any scenario below to trigger a live execution through the 6-stage recovery pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#161616] hover:bg-[#202020] text-blue-400 text-xs border border-[#2a2a2a] transition-colors font-mono"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Preview</span>
          </button>

          <button
            onClick={onRunBatch}
            disabled={isProcessing}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Run 75-Batch</span>
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

      {/* 2. The 5 Named Demo Scenarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
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

              <p className="text-[10px] text-[#777777] line-clamp-3 leading-relaxed mb-2.5">
                {sc.scenario_notes}
              </p>

              <button
                disabled={isProcessing}
                className="w-full py-1 text-[10px] font-mono rounded bg-[#161616] hover:bg-blue-600 hover:text-white text-[#cccccc] border border-[#2a2a2a] transition-colors flex items-center justify-center gap-1"
              >
                <span>Run Scenario</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Live Execution Trace Details if a Scenario was clicked */}
      {lastTrace && (
        <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Execution Result: {lastTrace.scenario_id}
              </h4>
            </div>
            <span className="text-[10px] font-mono text-blue-400">
              Idempotency Key: {lastTrace.trace?.['5_execute']?.idempotency_key}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded bg-[#111111] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Diagnosis</span>
              <div className="text-white font-bold">{lastTrace.trace?.['2_diagnose']?.root_cause}</div>
              <div className="text-[10px] text-[#666666] mt-1">Confidence: {(lastTrace.trace?.['2_diagnose']?.confidence * 100).toFixed(0)}%</div>
            </div>

            <div className="p-3 rounded bg-[#111111] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Intervention Policy</span>
              <div className="text-blue-400 font-bold">Tier {lastTrace.trace?.['3_decide']?.tier} — {lastTrace.trace?.['3_decide']?.action}</div>
              <div className="text-[10px] text-[#666666] mt-1">{lastTrace.trace?.['3_decide']?.scheduling_strategy}</div>
            </div>

            <div className="p-3 rounded bg-[#111111] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Execution Outcome</span>
              <div className="text-white font-bold uppercase">{lastTrace.trace?.['5_execute']?.outcome}</div>
              <div className="text-[10px] text-blue-400 mt-1">Recovered: ₹{lastTrace.trace?.['5_execute']?.amount_recovered}</div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#111111] border border-[#222222] text-xs text-[#aaaaaa]">
            <span className="text-white font-bold">Reasoning: </span>
            {lastTrace.trace?.['6_audit']?.decision_reasoning}
          </div>
        </div>
      )}

      {/* 4. Human-Readable Activity Feed */}
      <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">
            Recent Copilot Activity Feed
          </h3>
          <span className="text-[10px] font-mono text-[#888888]">
            Showing {Math.min(15, events.length)} of {events.length} records
          </span>
        </div>

        <div className="divide-y divide-[#1a1a1a] text-xs">
          {events.slice(0, 15).map((ev) => (
            <div key={ev.event_id} className="py-2.5 flex items-start justify-between gap-3 font-mono">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
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
                  <span className="text-white font-bold">{ev.customer_ref}</span>
                  <span className="text-[10px] text-[#666666]">Tier {ev.tier_used}</span>
                </div>
                <div className="text-[11px] text-[#888888]">
                  {ev.decision_reasoning.slice(0, 110)}...
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-white font-bold">
                  {ev.outcome === 'recovered' ? `₹${ev.amount_recovered.toLocaleString('en-IN')}` : `₹0`}
                </div>
                <div className="text-[10px] text-[#666666]">
                  {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
