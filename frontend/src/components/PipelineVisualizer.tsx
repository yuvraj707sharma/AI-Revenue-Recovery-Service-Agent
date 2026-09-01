'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code } from 'lucide-react';
import { PipelineTraceResponse } from '@/lib/api';

interface PipelineVisualizerProps {
  lastTrace: PipelineTraceResponse | null;
  isProcessing: boolean;
}

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ lastTrace, isProcessing }) => {
  const [showJsonDetails, setShowJsonDetails] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string>('2_diagnose');

  const traceData = lastTrace?.trace;
  const hasTrace = !!traceData;

  const stages = [
    {
      key: '1_detect',
      num: '1',
      name: 'DETECT',
      tag: traceData?.['1_detect'] ? `Event: ${traceData['1_detect'].event_id.slice(0, 10)}...` : 'Listening',
      desc: 'Ingests failure webhook',
    },
    {
      key: '2_diagnose',
      num: '2',
      name: 'DIAGNOSE',
      tag: traceData?.['2_diagnose'] ? `Cause: ${traceData['2_diagnose'].root_cause}` : 'Classification',
      desc: '5-Class Root Cause Engine',
    },
    {
      key: '3_decide',
      num: '3',
      name: 'DECIDE',
      tag: traceData?.['3_decide'] ? `Tier ${traceData['3_decide'].tier} Selected` : 'Zero-Click Policy',
      desc: 'Intervention Hierarchy',
    },
    {
      key: '4_bound',
      num: '4',
      name: 'BOUND',
      tag: traceData?.['4_bound'] ? (traceData['4_bound'].is_bounded ? `Rule: ${traceData['4_bound'].rule_name}` : 'Bounds Clear') : 'Stopping Rules',
      desc: 'Max Retries & Safety Gate',
    },
    {
      key: '5_execute',
      num: '5',
      name: 'EXECUTE',
      tag: traceData?.['5_execute'] ? `Outcome: ${traceData['5_execute'].outcome.toUpperCase()}` : 'SDK Dispatch',
      desc: 'Razorpay SDK / WhatsApp',
    },
    {
      key: '6_audit',
      num: '6',
      name: 'AUDIT',
      tag: traceData?.['6_audit'] ? 'Persisted in MySQL' : 'MySQL Log',
      desc: 'recovery_events Table',
    },
  ];

  return (
    <div className="bg-[#0a0a0a] border border-[#222222] p-4 rounded-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span>6-Stage Autonomous Pipeline</span>
            {isProcessing && (
              <span className="text-[10px] bg-blue-600 text-white font-mono px-2 py-0.5 rounded">
                Processing...
              </span>
            )}
          </h3>
          <p className="text-[11px] text-[#888888]">
            {lastTrace?.scenario_notes || 'Autonomous decision loop from webhook detection to MySQL audit commit.'}
          </p>
        </div>

        {hasTrace && (
          <button
            onClick={() => setShowJsonDetails(!showJsonDetails)}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#111111] hover:bg-[#161616] text-[#cccccc] text-xs border border-[#2a2a2a] transition-colors"
          >
            <Code className="w-3.5 h-3.5 text-blue-400" />
            <span>{showJsonDetails ? 'Hide JSON' : 'Inspect JSON Payloads'}</span>
            {showJsonDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* 6 Stage Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {stages.map((stage) => {
          const isCurrentActive = selectedStage === stage.key;
          return (
            <div
              key={stage.key}
              onClick={() => {
                setSelectedStage(stage.key);
                if (!showJsonDetails && hasTrace) setShowJsonDetails(true);
              }}
              className={`p-3 rounded border transition-colors cursor-pointer ${
                isCurrentActive && hasTrace
                  ? 'bg-[#111827] border-blue-500 text-white'
                  : 'bg-[#111111] hover:bg-[#161616] border-[#222222] text-[#888888]'
              }`}
            >
              <div className="text-[10px] font-mono text-blue-400 mb-1">
                STAGE {stage.num}
              </div>
              <div className="text-xs font-bold text-white mb-1">
                {stage.name}
              </div>
              <div className="text-[11px] text-[#cccccc] truncate font-mono">
                {stage.tag}
              </div>
              <div className="text-[10px] text-[#666666] mt-1">
                {stage.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* JSON Inspector */}
      {showJsonDetails && hasTrace && (
        <div className="p-4 rounded bg-[#050505] border border-[#222222] text-xs font-mono space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#1a1a1a]">
            <span className="text-white font-bold">
              STAGE: {selectedStage.toUpperCase()}
            </span>
            <div className="flex items-center gap-1.5">
              {stages.map((st) => (
                <button
                  key={st.key}
                  onClick={() => setSelectedStage(st.key)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    selectedStage === st.key
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#161616] text-[#888888] hover:text-white'
                  }`}
                >
                  {st.name}
                </button>
              ))}
            </div>
          </div>

          {/* Reasoning Highlights */}
          {selectedStage === '2_diagnose' && traceData?.['2_diagnose'] && (
            <div className="p-2.5 rounded bg-[#111111] border border-[#222222] text-white text-xs font-sans">
              <strong className="text-blue-400 font-mono">Diagnostic Reasoning:</strong> {traceData['2_diagnose'].reasoning}
            </div>
          )}
          {selectedStage === '3_decide' && traceData?.['3_decide'] && (
            <div className="p-2.5 rounded bg-[#111111] border border-[#222222] text-white text-xs font-sans">
              <strong className="text-blue-400 font-mono">Policy Decision:</strong> {traceData['3_decide'].reasoning}
            </div>
          )}
          {selectedStage === '4_bound' && traceData?.['4_bound'] && (
            <div className="p-2.5 rounded bg-[#111111] border border-[#222222] text-white text-xs font-sans">
              <strong className="text-blue-400 font-mono">Bound Rule:</strong> {traceData['4_bound'].reasoning}
            </div>
          )}
          {selectedStage === '5_execute' && traceData?.['5_execute'] && (
            <div className="p-2.5 rounded bg-[#111111] border border-[#222222] text-white text-xs font-sans">
              <strong className="text-blue-400 font-mono">Action:</strong> {traceData['5_execute'].action_taken} | <strong className="text-blue-400 font-mono">Recovered:</strong> ₹{traceData['5_execute'].amount_recovered}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-3 rounded bg-[#000000] border border-[#1a1a1a] text-[#888888] text-[11px] leading-relaxed">
            <pre>{JSON.stringify(traceData?.[selectedStage as keyof typeof traceData] || {}, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
