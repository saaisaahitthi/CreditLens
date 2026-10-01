import { useState } from 'react';
import { Search, Loader2, Dices, ChevronDown, CheckCircle2 } from 'lucide-react';
import type { CustomerFeatures } from '../api';
import { fetchRandomCustomer } from '../api';

const DEMO_PROFILES: Record<string, { label: string; features: CustomerFeatures }> = {
  'DEMO-LOW-RISK': {
    label: 'Low Risk — Stable Profile',
    features: {
      RevolvingUtilizationOfUnsecuredLines: 0.05, age: 58, 'NumberOfTime30-59DaysPastDueNotWorse': 0, DebtRatio: 0.15,
      MonthlyIncome: 9500, NumberOfOpenCreditLinesAndLoans: 6, NumberOfTimes90DaysLate: 0, NumberRealEstateLoansOrLines: 1,
      'NumberOfTime60-89DaysPastDueNotWorse': 0, NumberOfDependents: 1, MonthlyDebt: 1425, IncomePerDependent: 4750, CombinedPastDue: 0, HasDependents: 1,
    },
  },
  'DEMO-MEDIUM-RISK': {
    label: 'Medium Risk — Borderline',
    features: {
      RevolvingUtilizationOfUnsecuredLines: 0.45, age: 35, 'NumberOfTime30-59DaysPastDueNotWorse': 1, DebtRatio: 0.38,
      MonthlyIncome: 5200, NumberOfOpenCreditLinesAndLoans: 9, NumberOfTimes90DaysLate: 0, NumberRealEstateLoansOrLines: 0,
      'NumberOfTime60-89DaysPastDueNotWorse': 0, NumberOfDependents: 3, MonthlyDebt: 1976, IncomePerDependent: 1300, CombinedPastDue: 1, HasDependents: 1,
    },
  },
  'DEMO-HIGH-RISK': {
    label: 'High Risk — Delinquencies',
    features: {
      RevolvingUtilizationOfUnsecuredLines: 0.92, age: 42, 'NumberOfTime30-59DaysPastDueNotWorse': 2, DebtRatio: 0.60,
      MonthlyIncome: 3800, NumberOfOpenCreditLinesAndLoans: 8, NumberOfTimes90DaysLate: 1, NumberRealEstateLoansOrLines: 1,
      'NumberOfTime60-89DaysPastDueNotWorse': 1, NumberOfDependents: 2, MonthlyDebt: 2280, IncomePerDependent: 1266.67, CombinedPastDue: 4, HasDependents: 1,
    },
  },
};

interface Props {
  onAnalyze: (customerId: string, features: CustomerFeatures) => void;
  loading: boolean;
}

export default function CustomerForm({ onAnalyze, loading }: Props) {
  const [mode, setMode] = useState<'demo' | 'random'>('demo');
  const [selectedDemo, setSelectedDemo] = useState('DEMO-HIGH-RISK');
  const [randomData, setRandomData] = useState<{ id: string; features: CustomerFeatures } | null>(null);
  const [fetchingRandom, setFetchingRandom] = useState(false);

  const handleLoadRandom = async () => {
    setMode('random');
    setFetchingRandom(true);
    try {
      const res = await fetchRandomCustomer();
      setRandomData({ id: res.customer_id, features: res.features });
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingRandom(false);
    }
  };

  const activeFeatures = mode === 'demo' ? DEMO_PROFILES[selectedDemo].features : randomData?.features;
  const activeId = mode === 'demo' ? selectedDemo : randomData?.id;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeId && activeFeatures) {
      onAnalyze(activeId, activeFeatures);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-slate-200 uppercase tracking-wider">Target Profile</h3>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-950/50 rounded-xl">
        <button
          type="button"
          onClick={() => setMode('demo')}
          className={`py-2 text-[13px] font-medium rounded-lg transition-all ${mode === 'demo' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Preset Scenarios
        </button>
        <button
          type="button"
          onClick={handleLoadRandom}
          className={`py-2 text-[13px] font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${mode === 'random' ? 'bg-slate-800 text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          {fetchingRandom ? <Loader2 size={14} className="animate-spin" /> : <Dices size={14} />} Real Dataset
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
        {mode === 'demo' ? (
          <div className="relative">
            <select
              value={selectedDemo}
              onChange={e => setSelectedDemo(e.target.value)}
              className="w-full appearance-none bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-4 py-3
                focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-shadow"
            >
              {Object.entries(DEMO_PROFILES).map(([id, { label }]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <ChevronDown size={16} className="absolute right-4 top-3.5 text-slate-500 pointer-events-none" />
          </div>
        ) : (
          <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between">
             <span className="text-sm font-mono text-indigo-300">{activeId ?? 'Loading...'}</span>
             <CheckCircle2 size={16} className="text-indigo-400" />
          </div>
        )}

        {/* Feature Preview Grid */}
        <div className="flex-1 bg-slate-950/50 border border-slate-800/50 rounded-xl p-3">
          <p className="text-[11px] text-slate-500 font-semibold mb-2 uppercase tracking-wider">Profile Vector Preview</p>
          <div className="space-y-1.5">
            {activeFeatures && Object.entries(activeFeatures).slice(0, 5).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-[12px]">
                <span className="text-slate-400 truncate pr-2" title={k}>{k.replace(/([A-Z])/g, ' $1').trim().slice(0, 22)}</span>
                <span className="text-slate-200 font-mono bg-slate-900 px-1.5 py-0.5 rounded text-right whitespace-nowrap">
                  {typeof v === 'number' ? (v % 1 === 0 ? v : v.toFixed(2)) : (v ?? 'N/A')}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-slate-500 text-center border-t border-slate-800/50 pt-2">
            + 9 hidden features
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (!activeFeatures && mode === 'random')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500/50 
            disabled:opacity-50 text-white text-sm font-medium rounded-xl px-4 py-3
            flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.15)]"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing Model...</> : <><Search size={16} /> Analyze Risk</>}
        </button>
      </form>
    </div>
  );
}

export { DEMO_PROFILES };
