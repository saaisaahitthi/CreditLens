import { useState } from 'react';
import { Calculator, ShieldAlert, CheckCircle2, TrendingUp, DollarSign, Percent } from 'lucide-react';

interface Props {
  requestedAmount: number;
  monthlyIncome: number | null;
  riskProbability: number;
  riskCategory: string;
  dtiRatio: number | null;
  utilization: number | null;
}

export default function CreditRecommendationPanel({
  requestedAmount,
  monthlyIncome,
  riskProbability,
  riskCategory,
  dtiRatio,
  utilization,
}: Props) {
  const [overrideAmount, setOverrideAmount] = useState<number | null>(null);

  // Risk-based pricing matrix
  let baseApr = 13.5;
  if (riskCategory === 'Low') baseApr = 11.5;
  else if (riskCategory === 'Medium') baseApr = 16.8;
  else if (riskCategory === 'High') baseApr = 22.4;
  else if (riskCategory === 'Very High') baseApr = 28.5;

  // Max Debt Capacity calculation: max 45% of gross income toward total debt
  const maxMonthlyDebtCapacity = monthlyIncome ? monthlyIncome * 0.45 : 3000;
  const currentMonthlyDebt = (monthlyIncome && dtiRatio) ? monthlyIncome * dtiRatio : 1000;
  const availableMonthlyCapacity = Math.max(0, maxMonthlyDebtCapacity - currentMonthlyDebt);

  // Recommended Credit Limit derived mathematically
  let maxSafeLoan = availableMonthlyCapacity * 36; // 36-month term estimate
  if (riskProbability > 0.6) maxSafeLoan *= 0.4;
  else if (riskProbability > 0.4) maxSafeLoan *= 0.65;
  else if (riskProbability > 0.2) maxSafeLoan *= 0.85;

  // Bound recommended limit logically
  const recommendedLimit = Math.max(1000, Math.min(requestedAmount, Math.round(maxSafeLoan / 500) * 500));
  const activeLimit = overrideAmount !== null ? overrideAmount : recommendedLimit;
  const isCapped = activeLimit < requestedAmount;

  // Stipulations / Required Conditions
  const stips: string[] = [];
  if (riskCategory === 'High' || riskCategory === 'Very High') {
    stips.push('Mandatory 3-month bank statement verification via Account Aggregator (AA)');
    stips.push('Auto-debit (NACH / e-Mandate) setup required prior to disbursement');
  }
  if (utilization && utilization > 0.75) {
    stips.push('Require proof of payoff for high-utilization revolving credit accounts');
  }
  if (dtiRatio && dtiRatio > 0.5) {
    stips.push('Require debt consolidation agreement to lower monthly obligations');
  }
  if (stips.length === 0) {
    stips.push('Standard instant digital disbursement eligible');
  }

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-950/50 border border-indigo-700/40 rounded-lg">
            <Calculator size={16} className="text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Underwriting & Credit Limit Recommendation</h3>
            <p className="text-[11px] text-slate-400">Risk-Adjusted Pricing Engine & Stipulation Logic</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded border border-indigo-800/60">
          AUTOMATED POLICY ENGINE
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Requested vs Recommended */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Requested Amount</span>
            <DollarSign size={12} className="text-slate-500" />
          </p>
          <p className="text-base font-bold text-slate-300">${requestedAmount.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500 mt-1">Submitted by applicant</p>
        </div>

        {/* Recommended Credit Limit */}
        <div className={`border rounded-xl p-3 ${isCapped ? 'bg-amber-950/20 border-amber-800/40' : 'bg-emerald-950/20 border-emerald-800/40'}`}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Rec. Max Limit</span>
            <TrendingUp size={12} className={isCapped ? 'text-amber-400' : 'text-emerald-400'} />
          </p>
          <p className={`text-base font-bold ${isCapped ? 'text-amber-300' : 'text-emerald-300'}`}>
            ${recommendedLimit.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {isCapped ? `Capped (-${Math.round((1 - recommendedLimit/requestedAmount)*100)}% for risk)` : 'Full approval supported'}
          </p>
        </div>

        {/* Risk-Based APR */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Risk-Based APR</span>
            <Percent size={12} className="text-indigo-400" />
          </p>
          <p className="text-base font-bold text-indigo-300">{baseApr.toFixed(1)}%</p>
          <p className="text-[10px] text-slate-500 mt-1">{riskCategory} Risk tier rate</p>
        </div>
      </div>

      {/* Recommended Stipulations */}
      <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldAlert size={13} className="text-indigo-400" />
          Required Disbursement Stipulations ({stips.length})
        </p>
        <ul className="space-y-1.5">
          {stips.map((stip, i) => (
            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
              <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0 mt-0.5" />
              <span>{stip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
