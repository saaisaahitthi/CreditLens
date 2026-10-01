import type { RiskCategory } from '../types';
import { Scale, CreditCard, DollarSign, Users, AlertTriangle } from 'lucide-react';

const CATEGORY_CONFIG: Record<RiskCategory, { bg: string; text: string; stroke: string; label: string }> = {
  Low:       { bg: 'bg-emerald-950/30', text: 'text-emerald-400', stroke: 'text-emerald-500', label: 'LOW RISK' },
  Medium:    { bg: 'bg-amber-950/30',   text: 'text-amber-400',   stroke: 'text-amber-500',   label: 'MEDIUM RISK' },
  High:      { bg: 'bg-orange-950/30',  text: 'text-orange-400',  stroke: 'text-orange-500',  label: 'HIGH RISK' },
  'Very High': { bg: 'bg-red-950/30',   text: 'text-red-500',     stroke: 'text-red-500',     label: 'VERY HIGH RISK' },
};

interface Props {
  customerId: string;
  probability: number;
  category: RiskCategory;
  dtiPct: string | null;
  dtiBand: string;
  utilizationPct: string | null;
  utilizationBand: string;
  monthlyIncome: number | null;
  dependents: number;
  openCreditLines?: number;
  age?: number;
}

export default function RiskCard({
  customerId, probability, category,
  dtiPct, dtiBand, utilizationPct, utilizationBand,
  monthlyIncome, dependents, openCreditLines, age
}: Props) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG['High'];
  const pct = (probability * 100).toFixed(1);
  const strokeDash = `${probability * 100}, 100`;

  // NTC detection: young applicant with little-to-no credit history
  const isThinFile = (openCreditLines !== undefined && openCreditLines <= 2) || (age !== undefined && age < 27 && (openCreditLines === undefined || openCreditLines <= 3));
  const isNTC = openCreditLines !== undefined && openCreditLines === 0;

  return (
    <div className={`rounded-2xl p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-800 shadow-2xl flex flex-col h-full relative overflow-hidden`}>
      {/* Background glow */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[100px] opacity-20 ${cfg.bg.replace('/30', '')}`} />

      {/* Header */}
      <div className="flex items-start justify-between z-10">
        <div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Customer Profile</p>
          <p className="text-sm font-mono text-white bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">{customerId}</p>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border border-current ${cfg.text} bg-slate-950`}>
          {cfg.label}
        </span>
      </div>

      {/* NTC / Thin-File Alert Banner */}
      {(isNTC || isThinFile) && (
        <div className={`mt-4 z-10 rounded-xl px-4 py-3 flex items-start gap-3 border ${isNTC ? 'bg-violet-950/40 border-violet-700/40' : 'bg-blue-950/40 border-blue-700/40'}`}>
          <AlertTriangle size={15} className={`flex-shrink-0 mt-0.5 ${isNTC ? 'text-violet-400' : 'text-blue-400'}`} />
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-wider ${isNTC ? 'text-violet-300' : 'text-blue-300'}`}>
              {isNTC ? '⚠ New-to-Credit (NTC) Applicant' : '⚠ Thin Credit File Detected'}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
              {isNTC
                ? 'No prior credit history found. Bureau-based model score may underestimate creditworthiness. Consider supplementary signals: AA data, income verification, UPI transaction history.'
                : 'Applicant has limited credit history. Score confidence is lower than average. Manual review recommended before final decision.'}
            </p>
          </div>
        </div>
      )}

      {/* Gauge */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 z-10">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <path className="text-slate-800" strokeWidth="2.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path className={`${cfg.stroke} transition-all duration-1000 ease-out`} strokeDasharray={strokeDash} strokeWidth="2.5" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-black tabular-nums tracking-tighter ${cfg.text}`}>{pct}</span>
            <span className={`text-[10px] font-bold ${cfg.text} opacity-60 uppercase`}>% Default</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 z-10">
        <Metric icon={<Scale size={14} />} label="DTI Ratio" value={dtiPct ?? 'N/A'} sub={dtiBand} />
        <Metric icon={<CreditCard size={14} />} label="Utilization" value={utilizationPct ?? 'N/A'} sub={utilizationBand} />
        <Metric icon={<DollarSign size={14} />} label="Monthly Income" value={monthlyIncome != null ? `$${monthlyIncome.toLocaleString()}` : 'N/A'} sub="Verified" />
        <Metric icon={<Users size={14} />} label="Dependents" value={String(dependents)} sub="Household" />
      </div>
    </div>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-slate-950/50 border border-slate-800/60 rounded-xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-bold text-white">{value}</span>
      </div>
      {sub && <span className="text-[10px] text-slate-500 leading-tight truncate" title={sub}>{sub}</span>}
    </div>
  );
}
