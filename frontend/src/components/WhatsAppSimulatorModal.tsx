'use client';

import React, { useState, useEffect } from 'react';
import { X, Smartphone, RefreshCw, CheckCheck, CheckCircle } from 'lucide-react';
import { fetchWhatsAppMessages, simulateWhatsAppReply } from '@/lib/api';

interface WhatsAppSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshDashboard: () => void;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({
  isOpen,
  onClose,
  onRefreshDashboard,
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await fetchWhatsAppMessages();
      if (data.success && data.messages) {
        setMessages(data.messages);
        if (data.messages.length > 0 && !activeMessageId) {
          setActiveMessageId(data.messages[data.messages.length - 1].message_id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentMsg = messages.find((m) => m.message_id === activeMessageId) || messages[messages.length - 1];

  const handleSendReply = async (textToSend: string = 'YES') => {
    if (!currentMsg) return;
    setSimulating(true);
    try {
      const res = await simulateWhatsAppReply(currentMsg.message_id, textToSend);
      if (res.success) {
        setSuccessToast(res.message || 'Payment recovered successfully!');
        await loadMessages();
        onRefreshDashboard();
        setTimeout(() => setSuccessToast(null), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0a0a0a] border border-[#222222] w-full max-w-xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Bar */}
        <div className="bg-[#111111] px-4 py-3 border-b border-[#222222] flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              WhatsApp Verified Nudge Preview
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#222222] text-[#888888] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 font-mono text-xs">
          {/* Message selector */}
          {messages.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-[#666666] shrink-0 font-sans">Message:</span>
              {messages.map((m, idx) => (
                <button
                  key={m.message_id}
                  onClick={() => setActiveMessageId(m.message_id)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    activeMessageId === m.message_id
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-[#161616] text-[#888888] hover:text-white'
                  }`}
                >
                  #{idx + 1} ({m.masked_identifier})
                </button>
              ))}
            </div>
          )}

          {successToast && (
            <div className="p-2.5 rounded bg-[#111827] border border-blue-500 text-blue-300 text-xs font-sans flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Chat Mockup */}
          <div className="rounded border border-[#222222] bg-[#000000] overflow-hidden">
            {/* Header */}
            <div className="bg-[#111111] px-4 py-2.5 flex items-center justify-between border-b border-[#222222]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  R
                </div>
                <div>
                  <div className="text-xs font-bold text-white">
                    {currentMsg?.merchant_name || 'SaaSify Cloud Pro'}
                  </div>
                  <div className="text-[9px] text-blue-400 font-sans">
                    Verified Business Account
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-[#666666] font-sans">Official Notification</span>
            </div>

            {/* Bubble Area */}
            <div className="p-4 space-y-3 min-h-[200px] bg-[#050505]">
              {currentMsg ? (
                <>
                  <div className="bg-[#111111] border border-[#222222] text-white p-3 rounded text-xs space-y-2 max-w-[90%] font-sans">
                    <div className="flex justify-between text-[10px] text-[#666666] font-mono border-b border-[#1f1f1f] pb-1">
                      <span className="text-blue-400">REF: {currentMsg.order_ref}</span>
                      <span>{new Date(currentMsg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <p className="leading-relaxed text-[12px] text-[#e0e0e0]">
                      {currentMsg.message_body}
                    </p>

                    <div className="pt-1.5 border-t border-[#1f1f1f] flex justify-between text-[10px] font-mono text-[#888888]">
                      <span>Card: {currentMsg.masked_identifier}</span>
                      <span className="text-white font-bold">₹{currentMsg.amount?.toFixed(2)}</span>
                    </div>
                  </div>

                  {currentMsg.customer_replied && (
                    <div className="flex justify-end">
                      <div className="bg-blue-900/60 border border-blue-700 text-white p-2 rounded text-xs max-w-[60%] font-sans space-y-1">
                        <p className="font-bold">{currentMsg.reply_text}</p>
                        <div className="text-[9px] text-blue-300 flex items-center justify-end gap-1 font-mono">
                          <CheckCheck className="w-3 h-3 text-blue-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-10 text-[#666666] text-xs font-sans">
                  No Tier 2 messages dispatched yet.<br />
                  Run <strong className="text-white">Scenario 3</strong> to preview.
                </div>
              )}
            </div>

            {/* Interactive Reply */}
            {currentMsg && !currentMsg.customer_replied && (
              <div className="p-3 bg-[#111111] border-t border-[#222222] flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#888888] font-sans">Customer Action:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendReply('YES')}
                    disabled={simulating}
                    className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors disabled:opacity-50 font-sans"
                  >
                    Reply "YES" to Retry
                  </button>
                  <button
                    onClick={() => handleSendReply('NO')}
                    disabled={simulating}
                    className="px-3 py-1.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-[#888888] hover:text-white text-xs transition-colors font-sans"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#111111] px-4 py-2.5 border-t border-[#222222] flex items-center justify-between text-[11px] text-[#666666] font-mono">
          <span>Security: Zero Bare URLs Enforced</span>
          <button onClick={loadMessages} className="text-white hover:underline flex items-center gap-1 font-sans">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>
    </div>
  );
};
