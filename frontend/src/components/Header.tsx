'use client';

import React from 'react';
import { RefreshCw, BarChart3, ShieldCheck, Sparkles, MessageSquare } from 'lucide-react';

interface HeaderProps {
  activeTab: 'revenue' | 'activity' | 'settings';
  onTabChange: (tab: 'revenue' | 'activity' | 'settings') => void;
  onRefresh: () => void;
  onOpenReport: () => void;
  onOpenCopilotChat: () => void;
  isProcessing: boolean;
  totalInvoices: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onRefresh,
  onOpenReport,
  onOpenCopilotChat,
  isProcessing,
  totalInvoices,
}) => {
  return (
    <header className="border-b border-[#1f1f1f] bg-[#000000] px-6 py-3.5 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
            R
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide uppercase">
                Razorpay Recovery Copilot
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#111111] text-[#888888] border border-[#222222]">
                Merchant Cockpit
              </span>
            </div>
            <p className="text-[11px] text-[#888888]">
              Automated Subscription Recovery • Zero-Click-First
            </p>
          </div>
        </div>

        {/* 3 Merchant Tabs */}
        <div className="flex items-center bg-[#111111] border border-[#222222] rounded p-0.5">
          <button
            onClick={() => onTabChange('revenue')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'revenue'
                ? 'bg-blue-600 text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            Revenue & Anomalies
          </button>
          <button
            onClick={() => onTabChange('activity')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'activity'
                ? 'bg-blue-600 text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            Agent Activity & Demo
          </button>
          <button
            onClick={() => onTabChange('settings')}
            className={`px-3.5 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            Settings & Audit
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {/* Ask AI Copilot Button */}
          <button
            onClick={onOpenCopilotChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>Ask Copilot</span>
          </button>

          {/* Live Network Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111111] border border-[#222222] text-[11px] font-mono text-[#888888]">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Cross-Merchant Radar: Active</span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isProcessing}
            title="Refresh records"
            className="p-1.5 rounded bg-[#111111] hover:bg-[#1a1a1a] text-[#888888] hover:text-white border border-[#222222] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Internal / Judge Report Modal trigger */}
          <button
            onClick={onOpenReport}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#161616] hover:bg-[#202020] text-blue-400 text-xs border border-[#2a2a2a] transition-colors font-mono"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Judge Benchmark</span>
          </button>
        </div>
      </div>
    </header>
  );
};
