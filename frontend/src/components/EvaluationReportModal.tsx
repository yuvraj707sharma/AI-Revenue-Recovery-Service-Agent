'use client';

import React, { useState } from 'react';
import { X, Copy, Check, BarChart2, ShieldCheck } from 'lucide-react';
import { EvaluationReport } from '@/lib/api';

interface EvaluationReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: EvaluationReport | null;
}

export const EvaluationReportModal: React.FC<EvaluationReportModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !report) return null;

  const handleCopyReport = () => {
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const matrix = report.confusion_matrix || {};
  const causes = Object.keys(matrix);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0a0a0a] border border-[#222222] w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#111111] px-5 py-3.5 border-b border-[#222222] flex items-center justify-between text-white">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Internal Benchmark & Evaluation Report (Track 3)</span>
            </h3>
            <p className="text-[11px] text-[#888888] font-mono">
              Ground-Truth Verification • Confusion Matrix • Idempotency Audit
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white text-xs border border-[#333333] transition-colors font-mono"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#222222] text-[#888888] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs font-mono text-[#cccccc]">
          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded bg-[#111111] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Diagnosis Accuracy</span>
              <div className="text-xl font-bold text-white">{report.diagnosis_accuracy}%</div>
              <span className="text-[10px] text-[#666666]">{report.correct_diagnoses}/{report.total_events} Under Noisy Rails</span>
            </div>

            <div className="p-3 rounded bg-[#111111] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Net Recovery Rate</span>
              <div className="text-xl font-bold text-blue-400">{report.financials.revenue_recovery_rate_pct}%</div>
              <span className="text-[10px] text-[#666666]">₹{report.financials.amount_recovered.toLocaleString('en-IN')} of ₹{report.financials.amount_attempted.toLocaleString('en-IN')}</span>
            </div>

            <div className="p-3 rounded bg-[#111111] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">False-Nudge Rate</span>
              <div className="text-xl font-bold text-white">{report.false_nudge_metrics.false_nudge_rate_pct}%</div>
              <span className="text-[10px] text-[#666666]">{report.false_nudge_metrics.false_nudges_count} Unnecessary WhatsApps</span>
            </div>

            <div className="p-3 rounded bg-[#111111] border border-[#222222]">
              <span className="text-[10px] text-[#888888] uppercase block mb-1">Idempotency Stops</span>
              <div className="text-xl font-bold text-white">{report.idempotency_metrics.duplicate_blocked_count}</div>
              <span className="text-[10px] text-[#666666]">Double Charges Blocked</span>
            </div>
          </div>

          {/* Confusion Matrix */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Ground Truth Confusion Matrix</span>
              <span className="text-[10px] text-[#888888] font-normal">Rows = Actual Ground Truth, Columns = AI Predicted</span>
            </div>
            <div className="overflow-x-auto rounded border border-[#222222]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111111] text-[#888888] uppercase text-[10px] border-b border-[#222222]">
                  <tr>
                    <th className="px-3 py-2">Actual \ Predicted</th>
                    {causes.map((c) => (
                      <th key={c} className="px-3 py-2 text-center">{c.replace('hard_decline_', '').replace('mandate_', '')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {causes.map((gt) => (
                    <tr key={gt}>
                      <td className="px-3 py-2 text-white font-bold">{gt}</td>
                      {causes.map((pred) => {
                        const count = matrix[gt]?.[pred] || 0;
                        const isDiagonal = gt === pred;
                        return (
                          <td
                            key={pred}
                            className={`px-3 py-2 text-center ${
                              isDiagonal ? (count > 0 ? 'text-blue-400 font-bold bg-blue-950/20' : 'text-[#555555]') : (count > 0 ? 'text-white' : 'text-[#444444]')
                            }`}
                          >
                            {count}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tier Performance Breakdown */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-white uppercase tracking-wider">
              Performance by Intervention Tier
            </div>
            <div className="overflow-x-auto rounded border border-[#222222]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#111111] text-[#888888] uppercase text-[10px] border-b border-[#222222]">
                  <tr>
                    <th className="px-3 py-2">Tier</th>
                    <th className="px-3 py-2">Attempted</th>
                    <th className="px-3 py-2">Recovered</th>
                    <th className="px-3 py-2">₹ Attempted</th>
                    <th className="px-3 py-2">₹ Recovered</th>
                    <th className="px-3 py-2">Rate %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {Object.entries(report.tier_breakdown).map(([tierNum, data]) => (
                    <tr key={tierNum}>
                      <td className="px-3 py-2 text-white font-bold">{data.name}</td>
                      <td className="px-3 py-2">{data.attempted}</td>
                      <td className="px-3 py-2 text-white">{data.recovered}</td>
                      <td className="px-3 py-2">₹{data.amount_attempted.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-blue-400 font-bold">₹{data.amount_recovered.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2 text-white font-bold">{data.recovery_rate_pct?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#111111] px-5 py-3 border-t border-[#222222] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
