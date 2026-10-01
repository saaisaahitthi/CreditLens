import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import type { ShapFactor } from '../types';

interface Props {
  positiveFactors: ShapFactor[];
  negativeFactors: ShapFactor[];
}

export default function SHAPChart({ positiveFactors, negativeFactors }: Props) {
  const all = [
    ...positiveFactors.map(f => ({ ...f, color: '#f97316' })), 
    ...negativeFactors.map(f => ({ ...f, color: '#10b981' })), 
  ].sort((a, b) => Math.abs(b.shap_value_log_odds) - Math.abs(a.shap_value_log_odds));

  const data = all.map(f => ({
    name: f.feature.length > 20 ? f.feature.slice(0, 18) + '…' : f.feature,
    fullName: f.feature,
    value: parseFloat(f.shap_value_log_odds.toFixed(3)),
    actualValue: f.actual_value,
    color: f.color,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      const isRisk = d.value >= 0;
      return (
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[12px] shadow-2xl backdrop-blur-xl">
          <p className="font-semibold text-slate-200 mb-2 border-b border-slate-800 pb-2">{d.fullName}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Feature Value:</span>
              <span className="text-slate-300 font-mono">{d.actualValue ?? 'N/A'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">SHAP Impact:</span>
              <span className={`font-mono font-medium ${isRisk ? 'text-orange-400' : 'text-emerald-400'}`}>
                {isRisk ? '+' : ''}{d.value} <span className="text-[10px] text-slate-500">log-odds</span>
              </span>
            </div>
            <div className="pt-1 mt-1 border-t border-slate-800/50">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isRisk ? 'text-orange-500/70' : 'text-emerald-500/70'}`}>
                {isRisk ? '↑ Increases Default Risk' : '↓ Reduces Default Risk'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 shadow-2xl rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[13px] font-bold text-slate-200 uppercase tracking-wider">Model Explainability</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">TreeSHAP local feature contributions</p>
        </div>
        <div className="flex gap-4 text-[11px] font-medium uppercase tracking-wider text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" />Risk Driver</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Mitigant</span>
        </div>
      </div>
      <div className="flex-1 min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30, 41, 59, 0.4)' }} />
            <ReferenceLine x={0} stroke="#475569" strokeWidth={1} strokeDasharray="3 3" />
            <Bar dataKey="value" radius={[2, 2, 2, 2]} barSize={20}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
