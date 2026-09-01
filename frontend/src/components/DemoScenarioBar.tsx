'use client';

import React from 'react';
import { Layers, RotateCcw } from 'lucide-react';

interface DemoScenarioBarProps {
  onRunScenario: (scenarioId: string) => void;
  onRunFullBatch: () => void;
  onClearLogs: () => void;
  isProcessing: boolean;
  activeScenario: string | null;
}

export const DemoScenarioBar: React.FC<DemoScenarioBarProps> = ({
  onRunScenario,
  onRunFullBatch,
  onClearLogs,
  isProcessing,
  activeScenario,
}) => {
  const scenarios = [
    {
      id: 'demo_scenario_1_zero_click_insufficient_funds',
      num: '1',
      title: 'Zero-Click Balance',
      tier: 'Tier 1',
      desc: 'Insufficient funds -> Salary-cycle retry succeeds silently',
    },
    {
      id: 'demo_scenario_2_zero_click_timeout',
      num: '2',
      title: 'Zero-Click Timeout',
      tier: 'Tier 1',
      desc: 'Bank 504 gateway timeout -> Smart jitter retry succeeds',
    },
    {
      id: 'demo_scenario_3_tier2_expired_card',
      num: '3',
      title: 'Expired Card Nudge',
      tier: 'Tier 2',
      desc: 'Verified WhatsApp sent -> Customer replies YES -> recovered',
    },
    {
      id: 'demo_scenario_4_bounded_no_response',
      num: '4',
      title: 'Bounded Limit Stop',
      tier: 'Tier 2 Bounded',
      desc: 'Limit exceeded -> Stopping rule MAX_ATTEMPTS fires',
    },
    {
      id: 'demo_scenario_5_safety_refusal',
      num: '5',
      title: 'Safety Fraud Refusal',
      tier: 'Tier 3 Safety',
      desc: 'Suspected fraud -> Refuses auto-retry, routes to human desk',
    },
  ];

  return (
    <div className="bg-[#0a0a0a] border border-[#222222] p-4 rounded-lg space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1a1a1a]">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            Demo Scenarios (Click to Execute)
          </h2>
          <p className="text-[11px] text-[#888888]">
            Test each failure type under the zero-click-first policy
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRunFullBatch}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Run Full Batch (75)</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={isProcessing}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#111111] hover:bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#2a2a2a] text-xs transition-colors disabled:opacity-50"
            title="Reset DB"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset DB</span>
          </button>
        </div>
      </div>

      {/* 5 Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        {scenarios.map((s) => {
          const isActive = activeScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onRunScenario(s.id)}
              disabled={isProcessing}
              className={`text-left p-3 rounded border transition-colors ${
                isActive
                  ? 'bg-[#111827] border-blue-500 text-white'
                  : 'bg-[#111111] hover:bg-[#161616] border-[#222222] text-[#cccccc]'
              } disabled:opacity-50`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-white">
                  {s.num}. {s.title}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#1a1a1a] text-blue-400 border border-[#2a2a2a]">
                  {s.tier}
                </span>
              </div>
              <p className="text-[11px] text-[#888888] line-clamp-2 leading-relaxed">
                {s.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
