'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { RevenueAndAnomaliesTab } from '@/components/RevenueAndAnomaliesTab';
import { AgentActivityTab } from '@/components/AgentActivityTab';
import { SettingsAndAuditTab } from '@/components/SettingsAndAuditTab';
import { WhatsAppSimulatorModal } from '@/components/WhatsAppSimulatorModal';
import { EvaluationReportModal } from '@/components/EvaluationReportModal';
import { CopilotChatDrawer } from '@/components/CopilotChatDrawer';
import {
  fetchEvaluationReport,
  fetchRecoveryEvents,
  fetchLiveAnomalies,
  fetchMerchantPolicy,
  fetchDemoScenarios,
  fetchAnalyticsTrends,
  runSyntheticBatch,
  runDemoScenario,
  clearAuditLogs,
  EvaluationReport,
  RecoveryEventItem,
  AnomalyItem,
  MerchantPolicy,
  DemoScenarioItem,
  PipelineTraceResponse,
  AnalyticsTrends,
} from '@/lib/api';

export default function MerchantCockpitPage() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'activity' | 'settings'>('revenue');
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [events, setEvents] = useState<RecoveryEventItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [scenarios, setScenarios] = useState<DemoScenarioItem[]>([]);
  const [trends, setTrends] = useState<AnalyticsTrends | undefined>(undefined);
  const [policy, setPolicy] = useState<MerchantPolicy>({
    execution_mode: 'autonomous',
    max_retry_attempts: 3,
    cooldown_hours: 4.0,
    message_tone: 'english',
    auto_pause_on_outage: true,
  });

  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [lastTrace, setLastTrace] = useState<PipelineTraceResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals & Drawers
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isCopilotChatOpen, setIsCopilotChatOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportRes, eventsRes, anomRes, policyRes, scenRes, trendsRes] = await Promise.all([
        fetchEvaluationReport(),
        fetchRecoveryEvents({ limit: 200 }),
        fetchLiveAnomalies(),
        fetchMerchantPolicy(),
        fetchDemoScenarios(),
        fetchAnalyticsTrends(),
      ]);

      if (reportRes.success && reportRes.report) {
        setReport(reportRes.report);
      }
      if (eventsRes.success) {
        setEvents(eventsRes.events);
      }
      if (anomRes.success) {
        setAnomalies(anomRes.anomalies);
      }
      if (policyRes.success) {
        setPolicy(policyRes.policy);
      }
      if (scenRes.success) {
        setScenarios(scenRes.scenarios);
      }
      if (trendsRes.success && trendsRes.trends) {
        setTrends(trendsRes.trends);
      }
    } catch (err) {
      console.error('Failed to load merchant cockpit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000); // Live polling every 20s
    return () => clearInterval(interval);
  }, []);

  const handleRunScenario = async (scenarioId: string) => {
    setIsProcessing(true);
    setActiveScenario(scenarioId);
    setLastTrace(null);
    try {
      const res = await runDemoScenario(scenarioId);
      setLastTrace(res);
      showToast(`Scenario executed: ${res.trace['5_execute'].outcome.toUpperCase()}`);
      await loadData();
    } catch (err) {
      console.error('Scenario execution failed:', err);
      showToast('Error executing scenario');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunFullBatch = async (count: number = 75) => {
    setIsProcessing(true);
    showToast(`Ingesting & recovering ${count} synthetic subscription failures...`);
    try {
      await runSyntheticBatch(count, true);
      showToast(`${count}-event enterprise batch recovered successfully with idempotency guarantees.`);
      await loadData();
    } catch (err) {
      console.error('Batch generation failed:', err);
      showToast('Error running synthetic batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Clear all recovery event logs and reset demo state?')) return;
    setIsProcessing(true);
    try {
      await clearAuditLogs();
      showToast('Audit records cleared.');
      await loadData();
    } catch (err) {
      console.error('Failed to clear logs:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header & Navigation */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={loadData}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenCopilotChat={() => setIsCopilotChatOpen(true)}
        isProcessing={loading || isProcessing}
        totalInvoices={report?.valid_events_count || 0}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded bg-blue-600 text-white text-xs font-mono shadow-2xl border border-blue-400 flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Tab Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Tab 1: Revenue & Anomalies (With Visual Charts) */}
        {activeTab === 'revenue' && (
          <RevenueAndAnomaliesTab
            report={report}
            anomalies={anomalies}
            trends={trends}
            loading={loading}
          />
        )}

        {/* Tab 2: Agent Activity & Demo */}
        {activeTab === 'activity' && (
          <AgentActivityTab
            events={events}
            scenarios={scenarios}
            onRunScenario={handleRunScenario}
            onRunBatch={handleRunFullBatch}
            onClearLogs={handleClearLogs}
            onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
            isProcessing={isProcessing}
            activeScenario={activeScenario}
            lastTrace={lastTrace}
          />
        )}

        {/* Tab 3: Settings & Audit */}
        {activeTab === 'settings' && (
          <SettingsAndAuditTab
            policy={policy}
            events={events}
            onPolicyChange={setPolicy}
            onRefreshEvents={loadData}
            loading={loading}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-3.5 px-6 text-xs text-[#555555] bg-[#000000]">
        <div className="max-w-7xl mx-auto flex items-center justify-between font-mono">
          <span>Razorpay Recovery Copilot — Track 3: AI Revenue Recovery</span>
          <span className="text-[#444444]">Zero-Click First • Native Cross-Merchant Radar • Idempotent Execution</span>
        </div>
      </footer>

      {/* WhatsApp Preview & Interactive Simulator */}
      <WhatsAppSimulatorModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        onRefreshDashboard={loadData}
      />

      {/* Judge Benchmark & Accuracy Report Modal */}
      <EvaluationReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        report={report}
      />

      {/* AI Financial Copilot Chat Drawer */}
      <CopilotChatDrawer
        isOpen={isCopilotChatOpen}
        onClose={() => setIsCopilotChatOpen(false)}
      />
    </div>
  );
}
