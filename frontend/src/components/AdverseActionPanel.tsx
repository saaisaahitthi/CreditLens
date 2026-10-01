import { useState } from 'react';
import { FileWarning, Copy, CheckCheck, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ShapFactor } from '../types';

interface Props {
  customerId: string;
  riskCategory: string;
  riskProbability: number;
  topRiskFactors: ShapFactor[];
  onGenerate: (question: string) => Promise<{ llm_output: string }>;
}

export default function AdverseActionPanel({ customerId, riskCategory, riskProbability, topRiskFactors, onGenerate }: Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Only show for High/Very High risk
  const isDenialCandidate = riskCategory === 'High' || riskCategory === 'Very High';

  if (!isDenialCandidate && !notice) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setExpanded(true);
    try {
      const topFactors = topRiskFactors
        .slice(0, 3)
        .map((f, i) => `${i + 1}. ${f.feature.replace(/_/g, ' ')} (SHAP impact: +${(f.shap_value_log_odds || 0).toFixed(3)})`)
        .join('\n');

      const prompt = `You are a senior credit analyst at a regulated financial institution. 
Generate a formal, professional Adverse Action Notice for the following credit application denial.

Application ID: ${customerId}
Default Probability: ${(riskProbability * 100).toFixed(1)}%
Risk Category: ${riskCategory}

Top risk factors identified by our ML model (SHAP analysis):
${topFactors}

Write a formal adverse action notice that:
1. Clearly states the credit decision (denial)
2. Lists the top 3 specific reasons using plain language (translate technical feature names to human-readable terms)
3. Informs the applicant of their right to request the specific information on which the decision was based
4. Mentions they can request a free credit report within 60 days
5. Keeps a professional, empathetic but firm tone
6. Is written in the first person from "CreditLens Financial Services"
7. Does NOT include specific dollar amounts or internal model scores — only the qualitative reasons

Format it as a proper letter with date, subject line, body, and closing.`;

      const result = await onGenerate(prompt);
      setNotice(result.llm_output);
    } catch (e) {
      console.error(e);
      setNotice('Failed to generate notice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (notice) {
      navigator.clipboard.writeText(notice);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-red-900/30 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={() => notice && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-950/40 rounded-lg border border-red-800/30">
            <FileWarning size={16} className="text-red-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Adverse Action Notice Generator</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {notice ? 'AI-generated denial notice ready — click to expand' : 'Generate a formal, RBI-compliant denial notice for this applicant'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {notice && (
            <button
              onClick={e => { e.stopPropagation(); handleCopy(); }}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded-lg flex items-center gap-1.5 transition-all"
            >
              {copied ? <CheckCheck size={13} className="text-emerald-400" /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          {!notice ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <FileWarning size={13} />}
              {loading ? 'Generating...' : 'Generate Notice'}
            </button>
          ) : (
            expanded ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />
          )}
        </div>
      </div>

      {/* Notice Content */}
      {expanded && notice && (
        <div className="border-t border-red-900/20 px-6 py-5 bg-slate-950/20">
          <div className="bg-white/5 border border-slate-700/50 rounded-xl p-5">
            <pre className="text-[12px] text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{notice}</pre>
          </div>
          <p className="text-[10px] text-slate-600 mt-3 flex items-center gap-1">
            ⚠ AI-generated draft. Must be reviewed and approved by a licensed credit officer before sending.
          </p>
        </div>
      )}
    </div>
  );
}
