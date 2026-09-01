'use client';

import React, { useState } from 'react';
import { X, Send, Sparkles, MessageSquare, Bot, User, CornerDownLeft } from 'lucide-react';
import { queryCopilotChat } from '@/lib/api';

interface CopilotChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'copilot';
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "How much revenue was recovered via Zero-Click retries?",
  "Why did the Anomaly Radar hold HDFC retries today?",
  "Which bank has the highest failure rate this week?",
  "Are any customers at risk of double-charging?"
];

export const CopilotChatDrawer: React.FC<CopilotChatDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'copilot',
      text: "👋 **Hello! I'm your Razorpay Recovery Copilot.**\n\nAsk me anything about your subscription failure rates, live bank switch anomalies, Tier 1 zero-click performance, or customer WhatsApp interactions.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await queryCopilotChat(query);
      const copilotMsg: ChatMessage = {
        id: `copilot_${Date.now()}`,
        sender: 'copilot',
        text: res.response || "I couldn't process that query. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, copilotMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0a0a0a] border-l border-[#1f1f1f] shadow-2xl flex flex-col animate-slideInRight">
      {/* Header */}
      <div className="p-4 border-b border-[#1f1f1f] bg-[#111111] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Ask Recovery Copilot
            </h3>
            <p className="text-[10px] text-[#888888] font-mono">
              Live AI Financial & Rail Intelligence
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[#222222] text-[#888888] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs font-mono">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'copilot' && (
              <div className="w-5 h-5 rounded bg-blue-600/30 border border-blue-500/50 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-blue-400" />
              </div>
            )}

            <div
              className={`p-3 rounded max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-[#141414] border border-[#222222] text-[#dddddd] rounded-bl-none'
              }`}
            >
              {msg.text}
              <span
                className={`block text-[9px] mt-1 ${
                  msg.sender === 'user' ? 'text-blue-200' : 'text-[#666666]'
                }`}
              >
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === 'user' && (
              <div className="w-5 h-5 rounded bg-[#222222] flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-[#aaaaaa]" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[#888888] text-[11px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>Analyzing ledger and live rail stream...</span>
          </div>
        )}
      </div>

      {/* Quick Prompt Pills */}
      <div className="px-4 py-2 border-t border-[#1a1a1a] bg-[#0c0c0c] space-y-1.5">
        <span className="text-[9px] uppercase tracking-wider text-[#666666] block">
          Quick Insights
        </span>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSend(prompt)}
              className="text-[10px] px-2 py-0.5 rounded bg-[#161616] hover:bg-[#222222] text-[#aaaaaa] hover:text-white border border-[#2a2a2a] transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#1f1f1f] bg-[#111111]">
        <div className="flex items-center gap-2 bg-[#000000] border border-[#262626] rounded px-3 py-1.5 focus-within:border-blue-500">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about failed invoices, bank outages, recovered ARR..."
            className="flex-1 bg-transparent text-xs text-white placeholder-[#555555] outline-none font-mono"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-1 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-30"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
