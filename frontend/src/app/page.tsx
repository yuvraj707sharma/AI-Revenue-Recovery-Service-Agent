'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { RevenueAndAnomaliesTab } from '@/components/RevenueAndAnomaliesTab';
import { AgentActivityTab } from '@/components/AgentActivityTab';
import { SettingsAndAuditTab } from '@/components/SettingsAndAuditTab';
import { WhatsAppSimulatorModal } from '@/components/WhatsAppSimulatorModal';
import { EvaluationReportModal } from '@/components/EvaluationReportModal';
import {
  fetchEvaluationReport,
  fetchRecoveryEvents,
  fetchLiveAnomalies,
  fetchMerchantPolicy,
  fetchDemoScenarios,
  runSyntheticBatch,
  runDemoScenario,
  clearAuditLogs,
  EvaluationReport,
  RecoveryEventItem,
  AnomalyItem,
  MerchantPolicy,
  DemoScenarioItem,
  PipelineTraceResponse,
} from '@/lib/api';

export default function MerchantCockpitPage() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'activity' | 'settings'>('revenue');
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [events, setEvents] = useState<RecoveryEventItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [scenarios, setScenarios] = useState<DemoScenarioItem[]>([]);
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

  // Modals
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportRes, eventsRes, anomRes, policyRes, scenRes] = await Promise.all([
        fetchEvaluationReport(),
        fetchRecoveryEvents({ limit: 150 }),
        fetchLiveAnomalies(),
        fetchMerchantPolicy(),
        fetchDemoScenarios(),
      ]);

      if (reportRes.success && reportRes.report) {
        setReport(reportRes.report);
      }
      if (eventsRes.success && eventsRes.events) {
        setEvents(eventsRes.events);
      }
      if (anomRes.success && anomRes.anomalies) {
        setAnomalies(anomRes.anomalies);
      }
      if (policyRes.success && policyRes.policy) {
        setPolicy(policyRes.policy);
      }
      if (scenRes.success && scenRes.scenarios) {
        setScenarios(scenRes.scenarios);
      }
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunScenario = async (scenarioId: string) => {
    setIsProcessing(true);
    setActiveScenario(scenarioId);
    try {
      const res = await runDemoScenario(scenarioId);
      if (res.success) {
        setLastTrace(res);
        showToast(`Executed ${scenarioId}`);
        await loadData();
      }
    } catch (e) {
      console.error('Error running scenario:', e);
      showToast('Error running scenario.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunFullBatch = async () => {
    setIsProcessing(true);
    try {
      showToast('Running 75-invoice simulation batch...');
      const res = await runSyntheticBatch(75, true);
      if (res.success) {
        showToast(`Processed ${res.total_processed} invoices through 6-stage pipeline.`);
        await loadData();
      }
    } catch (e) {
      console.error('Error running batch:', e);
      showToast('Error running batch simulation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Reset all audit logs for a clean demonstration run?')) return;
    setIsProcessing(true);
    try {
      await clearAuditLogs();
      setLastTrace(null);
      setActiveScenario(null);
      showToast('Audit records cleared.');
      await loadData();
    } catch (e) {
      console.error('Error clearing logs:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-white selection:bg-blue-600 selection:text-white">
      {/* Minimal Header with 3 Tab Selectors */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onRefresh={loadData}
        onOpenReport={() => setIsReportOpen(true)}
        isProcessing={loading || isProcessing}
        totalInvoices={events.length}
      />

      {/* Main Content */}
      <main className="max-w-7xl w-full mx-auto px-6 py-6 space-y-4 flex-1">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded bg-[#111111] border border-blue-500 shadow-2xl text-xs font-mono text-white flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab 1: Revenue & Anomalies (Default View) */}
        {activeTab === 'revenue' && (
          <RevenueAndAnomaliesTab
            report={report}
            anomalies={anomalies}
            loading={loading}
          />
        )}

        {/* Tab 2: Agent Activity & Demo */}
        {activeTab === 'activity' && (
          <AgentActivityTab
            scenarios={scenarios}
            events={events}
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
    </div>
  );
}
