import { useState } from 'react';
import { Brain, ShieldCheck, List, LayoutDashboard, Target, LogOut, User } from 'lucide-react';
import Login from './components/Login';
import CustomerQueue from './components/CustomerQueue';
import RiskCard from './components/RiskCard';
import SHAPChart from './components/SHAPChart';
import CopilotChat from './components/CopilotChat';
import PolicyQA from './components/PolicyQA';
import AdverseActionPanel from './components/AdverseActionPanel';
import CreditRecommendationPanel from './components/CreditRecommendationPanel';
import { predict, combinedAnalysis } from './api';
import type { PredictResponse, RiskCategory } from './types';
import type { CustomerFeatures } from './api';

type View = 'queue' | 'analysis' | 'policy';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<View>('queue');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [currentFeatures, setCurrentFeatures] = useState<CustomerFeatures | null>(null);
  const [currentId, setCurrentId] = useState<string>('');
  const [currentName, setCurrentName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  const handleSelectFromQueue = async (customerId: string, name: string, features: CustomerFeatures) => {
    setLoading(true);
    setError(null);
    setCurrentFeatures(features);
    setCurrentId(customerId);
    setCurrentName(name);
    setView('analysis'); // switch to analysis view
    
    try {
      const data = await predict(customerId, features);
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? e.message ?? 'API error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopilotSend = async (question: string) => {
    if (!currentFeatures) throw new Error("No customer selected");
    const res = await combinedAnalysis(currentId, currentFeatures, question);
    return { llm_output: res.llm_output, policy_evidence: res.policy_evidence };
  };

  const fm = result?.financial_metrics;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR */}
      <aside className="w-64 bg-slate-900/40 border-r border-slate-800 flex flex-col backdrop-blur-xl z-20 relative">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-white tracking-wide leading-tight">CreditLens</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Risk Platform</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Workspace</p>
          
          <button onClick={() => setView('queue')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${view === 'queue' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
            <List size={16} /> Applications Queue
          </button>
          
          <button onClick={() => { if(result) setView('analysis'); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${view === 'analysis' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'} ${!result && view !== 'analysis' ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <LayoutDashboard size={16} /> Active Analysis
          </button>

          <button onClick={() => setView('policy')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${view === 'policy' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>
            <Target size={16} /> Policy Directory
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <User size={14} className="text-slate-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Jane Doe</p>
              <p className="text-[10px] text-slate-400">Senior Underwriter</p>
            </div>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative z-10 h-full overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800/50 bg-slate-900/20 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-slate-200">
            {view === 'queue' && 'Loan Applications Queue'}
            {view === 'analysis' && (
              <span className="flex items-center gap-2">
                Customer Analysis <ChevronRight size={14} className="text-slate-600" /> 
                <span className="text-indigo-400">{currentName || currentId}</span>
              </span>
            )}
            {view === 'policy' && 'Policy Knowledge Base'}
          </h2>
          {view === 'analysis' && result && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-3 py-1.5 rounded-full">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">AI Guardrails Active</span>
            </div>
          )}
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            
            {error && (
              <div className="mb-6 bg-red-950/50 border border-red-900/50 rounded-xl px-5 py-4 text-sm text-red-300 flex items-start gap-3 backdrop-blur-sm">
                 <ShieldCheck size={18} className="text-red-500 mt-0.5" />
                 <div><strong className="block text-red-400 mb-1">Analysis Failed</strong>{error}</div>
              </div>
            )}

            {view === 'queue' && (
              <CustomerQueue onSelect={handleSelectFromQueue} />
            )}

            {view === 'analysis' && (
              loading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                   <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                   <p className="text-sm font-medium text-slate-300">Running ML Model & SHAP Explainer...</p>
                </div>
              ) : !result ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-slate-500">Please select an application from the queue.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-8">
                  {/* Left Column: Model Output */}
                  <div className="xl:col-span-7 flex flex-col gap-6">
                    <RiskCard
                      customerId={result.customer_id}
                      probability={result.risk_probability}
                      category={result.risk_category as RiskCategory}
                      dtiPct={fm?.dti?.dti_pct ?? null}
                      dtiBand={fm?.dti?.band ?? ''}
                      utilizationPct={fm?.utilization?.utilization_pct ?? null}
                      utilizationBand={fm?.utilization?.band ?? ''}
                      monthlyIncome={fm?.monthly_income ?? null}
                      dependents={fm?.number_of_dependents ?? 0}
                      openCreditLines={currentFeatures?.NumberOfOpenCreditLinesAndLoans}
                      age={currentFeatures?.age}
                    />
                    <div className="h-[400px]">
                      <SHAPChart
                        positiveFactors={result.top_risk_factors}
                        negativeFactors={result.risk_reducing_factors}
                      />
                    </div>

                    {/* Credit Limit & Risk-Based Pricing Engine */}
                    <CreditRecommendationPanel
                      requestedAmount={currentFeatures?.loan_amount || 25000}
                      monthlyIncome={fm?.monthly_income ?? null}
                      riskProbability={result.risk_probability}
                      riskCategory={result.risk_category}
                      dtiRatio={fm?.dti?.dti_ratio ?? null}
                      utilization={fm?.utilization?.utilization_raw ?? null}
                    />

                    {/* Adverse Action Notice Generator */}
                    <AdverseActionPanel
                      customerId={result.customer_id}
                      riskCategory={result.risk_category}
                      riskProbability={result.risk_probability}
                      topRiskFactors={result.top_risk_factors}
                      onGenerate={handleCopilotSend}
                    />
                  </div>

                  {/* Right Column: AI Copilot */}
                  <div className="xl:col-span-5 flex flex-col h-full min-h-[600px]">
                    <CopilotChat
                      key={currentId}
                      onSend={handleCopilotSend}
                      placeholder="Ask for an analyst summary or policy details..."
                      title="CreditLens Copilot"
                      riskCategory={result?.risk_category}
                    />
                  </div>
                </div>
              )
            )}


            {view === 'policy' && (
              <div className="max-w-4xl mx-auto w-full">
                <PolicyQA />
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

// Quick inline component for the Chevron (missing import earlier)
function ChevronRight(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
