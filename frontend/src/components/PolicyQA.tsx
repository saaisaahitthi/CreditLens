import { useState, useRef, useEffect } from 'react';
import { Search, Send, AlertCircle, Loader2 } from 'lucide-react';
import { policyQA } from '../api';

interface Citation {
  document: string;
  page: number;
  excerpt: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  citations?: Citation[];
  isError?: boolean;
}

const SUGGESTED = [
  'What is the policy on DTI ratios above 40%?',
  'What does policy say about revolving utilization above 80%?',
  'How are past-due accounts treated in credit assessment?',
];

export default function PolicyQA() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await policyQA(q);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: res.llm_output,
        citations: res.policy_evidence,
      }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: `Error: ${e?.response?.data?.detail ?? e.message}`,
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800/60 rounded-2xl flex flex-col h-[480px]">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-700">
        <Search size={16} className="text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Policy Knowledge Base Q&A</h3>
        <span className="ml-auto text-xs text-slate-500 italic">RAG + Gemini · citation-grounded</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Suggested questions</p>
            {SUGGESTED.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                className="w-full text-left text-xs text-slate-300 bg-slate-900/60 hover:bg-slate-900
                  border border-slate-700 hover:border-amber-700 rounded-xl px-4 py-2.5 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
              ${msg.role === 'user'
                ? 'bg-amber-700/30 ring-1 ring-amber-700/50 text-amber-100'
                : msg.isError
                  ? 'bg-red-900/30 ring-1 ring-red-700 text-red-300'
                  : 'bg-slate-700/60 text-slate-100'}`}>
              {msg.text}
            </div>
            {msg.citations?.map((c, j) => (
              <div key={j} className="flex items-start gap-1.5 text-xs text-slate-400 bg-slate-900/60 rounded-lg px-3 py-1.5 max-w-[90%]">
                <AlertCircle size={11} className="mt-0.5 text-amber-500 flex-shrink-0" />
                <div>
                  <span className="text-amber-400 font-medium">{c.document}</span> · Page {c.page}
                  <p className="text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{c.excerpt}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 size={13} className="animate-spin" /> Retrieving policy context…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask about credit policy…"
            disabled={loading}
            className="flex-1 bg-slate-900/80 text-sm text-white placeholder-slate-500 rounded-xl px-4 py-2.5
              border border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-600 disabled:opacity-50"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl px-4 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
