import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle, ShieldCheck } from 'lucide-react';
import type { PolicyEvidence } from '../types';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  evidence?: PolicyEvidence[];
  isError?: boolean;
}

interface Props {
  onSend: (question: string) => Promise<{ llm_output: string; policy_evidence?: PolicyEvidence[] }>;
  placeholder?: string;
  title?: string;
  riskCategory?: string;
}

const SUGGESTED: Record<string, string[]> = {
  'High': [
    'Summarize the top risk factors driving this score',
    'What credit policy applies to applicants with 90-day delinquencies?',
    'What are the standard grounds for denial?',
  ],
  'Medium': [
    'What conditions would need to improve for approval?',
    'What is our DTI threshold for medium-risk applicants?',
    'Provide a balanced risk and opportunity summary',
  ],
  'Low': [
    'Summarize the key strengths of this applicant',
    'What is the standard approval workflow for low-risk applicants?',
    'Draft a brief conditional approval note',
  ],
};

export default function CopilotChat({ onSend, placeholder = 'Ask a question...', title = 'CreditLens Copilot', riskCategory }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'CreditLens Analyst Assistant initialized. I am synced with the current applicant\'s ML risk factors and internal credit policy. How can I assist with your review?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await onSend(q);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.llm_output,
        evidence: res.policy_evidence,
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `System Error: ${e?.response?.data?.detail ?? e.message ?? 'Connection failed'}`,
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl flex flex-col h-full min-h-[520px] shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800 bg-slate-950/50 rounded-t-2xl">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Bot size={16} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">{title}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">System Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border
              ${msg.role === 'user' ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
              <div className={`px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap shadow-sm
                ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                  : msg.isError
                    ? 'bg-red-950/50 border border-red-900/50 text-red-300 rounded-2xl rounded-tl-sm'
                    : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-2xl rounded-tl-sm'}`}>
                {msg.text}
              </div>
              {/* Policy evidence citations */}
              {msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-1 space-y-1.5">
                  {msg.evidence.map((ev, j) => (
                    <div key={j} className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-950/50 border border-slate-800/80 rounded-lg px-3 py-2">
                      <AlertCircle size={12} className="mt-0.5 text-amber-500 flex-shrink-0" />
                      <span>Source: <span className="text-slate-300 font-medium">{ev.document}</span> (Page {ev.page})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Bot size={14} className="text-slate-400" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-5 py-4">
              <div className="flex gap-1.5 items-center h-2">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-slate-800 bg-slate-950/30 rounded-b-2xl">
        {/* Suggested questions — shown when a customer is loaded */}
        {riskCategory && SUGGESTED[riskCategory] && messages.length <= 1 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTED[riskCategory].map(q => (
              <button
                key={q}
                onClick={() => { setInput(q); }}
                className="text-[11px] px-3 py-1.5 bg-slate-800 hover:bg-indigo-600/20 hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 border border-slate-700 rounded-lg transition-all text-left"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={placeholder}
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-700 text-[13px] text-white placeholder-slate-500 rounded-xl px-4 py-3
              focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl px-5
              flex items-center gap-2 text-sm font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.15)]"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2">
           <ShieldCheck size={12} className="text-slate-600" />
           <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
             Internal Use Only — Output Requires Analyst Verification
           </p>
        </div>
      </div>
    </div>
  );
}
