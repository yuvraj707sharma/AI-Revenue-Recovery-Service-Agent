'use client';

import React from 'react';
import { BarChart3, TrendingUp, Landmark, PieChart } from 'lucide-react';
import { AnalyticsTrends } from '@/lib/api';

interface VisualAnalyticsChartsProps {
  trends?: AnalyticsTrends;
}

export const VisualAnalyticsCharts: React.FC<VisualAnalyticsChartsProps> = ({ trends }) => {
  const series = trends?.trend_series || [
    { day: 'Wed', attempted: 45000, recovered: 18200, recovery_rate: 40.4 },
    { day: 'Thu', attempted: 52000, recovered: 21400, recovery_rate: 41.1 },
    { day: 'Fri', attempted: 68000, recovered: 26500, recovery_rate: 39.0 },
    { day: 'Sat', attempted: 74000, recovered: 28900, recovery_rate: 39.1 },
    { day: 'Sun', attempted: 59000, recovered: 22800, recovery_rate: 38.6 },
    { day: 'Mon', attempted: 88000, recovered: 35200, recovery_rate: 40.0 },
    { day: 'Tue', attempted: 62000, recovered: 24100, recovery_rate: 38.9 },
  ];

  const banks = trends?.bank_stats || [
    { bank: 'HDFC', name: 'HDFC Bank', invoices: 32, recovered_pct: 41.5, status: 'Degraded (+14% Spike)', volume_recovered: 82000 },
    { bank: 'ICICI', name: 'ICICI Bank', invoices: 22, recovered_pct: 46.2, status: 'Optimal', volume_recovered: 64000 },
    { bank: 'SBIN', name: 'State Bank of India', invoices: 12, recovered_pct: 34.8, status: 'Optimal', volume_recovered: 38000 },
    { bank: 'AXIS', name: 'Axis Bank', invoices: 8, recovered_pct: 39.0, status: 'Optimal', volume_recovered: 32000 },
  ];

  const maxAttempted = Math.max(...series.map((s) => s.attempted), 100000);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 font-mono">
      {/* 1. 7-Day Inflow vs Recovered Daily Trend */}
      <div className="lg:col-span-2 p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              7-Day Recovery Trend (Attempted vs. Captured)
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#888888]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-[#333333]" /> Attempted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-blue-500" /> Recovered
            </span>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2 border-b border-[#1f1f1f]">
          {series.map((item, idx) => {
            const attHeight = Math.max(15, (item.attempted / maxAttempted) * 100);
            const recHeight = Math.max(10, (item.recovered / maxAttempted) * 100);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                <div className="text-[9px] text-blue-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  ₹{(item.recovered / 1000).toFixed(0)}k
                </div>
                <div className="w-full max-w-[32px] flex items-end justify-center gap-1 h-32">
                  <div
                    style={{ height: `${attHeight}%` }}
                    className="w-1/2 bg-[#222222] rounded-t transition-all group-hover:bg-[#333333]"
                  />
                  <div
                    style={{ height: `${recHeight}%` }}
                    className="w-1/2 bg-blue-600 rounded-t transition-all group-hover:bg-blue-500 shadow-sm"
                  />
                </div>
                <span className="text-[10px] text-[#777777] mt-1">{item.day}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#888888] pt-1">
          <span>Weekly Involuntary Churn Recovered: <strong className="text-white">~38.4%</strong></span>
          <span>Consistent with enterprise dunning baselines</span>
        </div>
      </div>

      {/* 2. Bank Switch Health & Recovery Breakdown */}
      <div className="p-4 rounded bg-[#0a0a0a] border border-[#1f1f1f] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-3.5 h-3.5 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Bank-Wise Recovery Health
            </h3>
          </div>
          <span className="text-[10px] text-[#888888]">Live Rails</span>
        </div>

        <div className="space-y-3 pt-1 text-xs">
          {banks.map((b) => (
            <div key={b.bank} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-bold">{b.bank}</span>
                  <span className="text-[10px] text-[#666666]">({b.invoices} invoices)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] ${b.status.includes('Degraded') ? 'text-blue-400 font-bold' : 'text-[#777777]'}`}>
                    {b.status}
                  </span>
                  <span className="text-white font-bold">{b.recovered_pct}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  style={{ width: `${b.recovered_pct}%` }}
                  className={`h-full rounded-full transition-all ${
                    b.status.includes('Degraded') ? 'bg-blue-400' : 'bg-blue-600'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 text-[10px] text-[#666666] border-t border-[#1a1a1a]">
          ↳ Anomaly Radar automatically prioritizes retries on optimal switches (ICICI/Axis) while holding degraded ones.
        </div>
      </div>
    </div>
  );
};
