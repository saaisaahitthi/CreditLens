import { useState, useEffect } from 'react';
import { Search, RefreshCw, FileText, Plus, X, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Bell } from 'lucide-react';
import { fetchQueue, updateQueueStatus, addApplicant } from '../api';
import type { QueueCustomer, AuditEntry } from '../types';

interface Props {
  onSelect: (customerId: string, name: string, features: any) => void;
}

const STATUS_OPTIONS = ['Pending Review', 'Approved', 'Denied', 'Needs More Info'];
const STATUS_COLORS: Record<string, string> = {
  'Pending Review': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  'Approved': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'Denied': 'bg-red-500/10 text-red-500 border-red-500/20',
  'Needs More Info': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

type SortKey = 'customer_id' | 'name' | 'date_applied' | 'loan_amount' | 'status';
type SortDir = 'asc' | 'desc';

export default function CustomerQueue({ onSelect }: Props) {
  const [queue, setQueue] = useState<QueueCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{ id: string; newStatus: string } | null>(null);
  const [notifyModal, setNotifyModal] = useState<QueueCustomer | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date_applied');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await fetchQueue();
      setQueue(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQueue(); }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    if (newStatus === 'Approved' || newStatus === 'Denied') {
      setDecisionModal({ id, newStatus });
    } else {
      commitStatusChange(id, newStatus, '');
    }
  };

  const commitStatusChange = async (id: string, newStatus: string, reason: string) => {
    const updated = queue.map(q => q.customer_id === id
      ? { ...q, status: newStatus, audit_log: [...(q.audit_log ?? []), { status: newStatus, reason, analyst: 'Jane Doe', timestamp: new Date().toLocaleString() } as AuditEntry] }
      : q
    );
    setQueue(updated);
    try {
      await updateQueueStatus(id, newStatus, reason, 'Jane Doe');
      // After Approved/Denied, offer to notify the applicant
      if (newStatus === 'Approved' || newStatus === 'Denied') {
        const customer = updated.find(q => q.customer_id === id);
        if (customer) setNotifyModal(customer);
      }
    } catch (e) {
      console.error('Failed to update status');
      loadQueue();
    }
  };

  const sortedFiltered = queue
    .filter(q =>
      q.name.toLowerCase().includes(search.toLowerCase()) ||
      q.customer_id.toLowerCase().includes(search.toLowerCase()) ||
      q.date_applied.includes(search) ||
      (q.loan_purpose ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let av: any = a[sortKey], bv: any = b[sortKey];
      if (sortKey === 'loan_amount') { av = Number(av); bv = Number(bv); }
      else { av = String(av ?? '').toLowerCase(); bv = String(bv ?? '').toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const total = queue.length;
  const approved = queue.filter(q => q.status === 'Approved').length;
  const denied = queue.filter(q => q.status === 'Denied').length;
  const pending = queue.filter(q => q.status === 'Pending Review').length;
  const totalVolume = queue.reduce((s, q) => s + (q.loan_amount || 0), 0);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={11} className="text-slate-600 ml-1" />;
    return sortDir === 'asc' ? <ArrowUp size={11} className="text-indigo-400 ml-1" /> : <ArrowDown size={11} className="text-indigo-400 ml-1" />;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden relative">
      <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100">Applications Queue</h2>
          <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider">Manage & Review Pending Loans</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search ID, Name, or Date..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
            />
          </div>
          <button onClick={loadQueue} disabled={loading} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center transition-colors border border-slate-700">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowImportModal(true)} className="px-3 py-2 bg-slate-800 hover:bg-indigo-600 hover:border-indigo-500 text-slate-300 hover:text-white text-sm rounded-lg flex items-center gap-2 transition-all border border-slate-700">
             Lookup Application
          </button>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg flex items-center gap-2 transition-all">
            <Plus size={16} /> New Application
          </button>
        </div>
      </div>

      {/* KPI Summary Bar */}
      {!loading && queue.length > 0 && (
        <div className="grid grid-cols-5 divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/30">
          {[
            { label: 'Total Applications', value: total, color: 'text-slate-200' },
            { label: 'Pending Review', value: pending, color: 'text-amber-400' },
            { label: 'Approved', value: approved, color: 'text-emerald-400' },
            { label: 'Denied', value: denied, color: 'text-red-400' },
            { label: 'Portfolio Volume', value: `$${(totalVolume / 1000).toFixed(0)}K`, color: 'text-indigo-400' },
          ].map(kpi => (
            <div key={kpi.label} className="px-5 py-3 text-center">
              <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{kpi.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-900/90 backdrop-blur z-10">
            <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
              {([
                ['customer_id', 'App ID'],
                ['name', 'Applicant Name'],
                ['date_applied', 'Date Applied'],
                ['loan_amount', 'Loan Amount'],
                ['status', 'Status'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th key={key} className="px-5 py-3 font-semibold cursor-pointer hover:text-slate-300 transition-colors select-none" onClick={() => handleSort(key)}>
                  <span className="inline-flex items-center">{label}<SortIcon col={key} /></span>
                </th>
              ))}
              <th className="px-5 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {loading && queue.length === 0 ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-5 bg-slate-800/50 rounded animate-pulse w-full"></div></td></tr>
              ))
            ) : sortedFiltered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-sm">No applications found.</td></tr>
            ) : (
              sortedFiltered.map(app => (
                <>
                  <tr key={app.customer_id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-3 text-xs font-mono text-indigo-300">{app.customer_id}</td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-200">{app.name}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">{app.date_applied}</td>
                    <td className="px-5 py-3 text-sm text-slate-300">${app.loan_amount.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <select
                        value={app.status}
                        onChange={(e) => handleStatusChange(app.customer_id, e.target.value)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border focus:outline-none appearance-none cursor-pointer ${STATUS_COLORS[app.status] ?? STATUS_COLORS['Pending Review']}`}
                      >
                        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-slate-900 text-slate-200">{opt}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Audit log toggle */}
                        {app.audit_log && app.audit_log.length > 0 && (
                          <button
                            onClick={() => setExpandedAudit(expandedAudit === app.customer_id ? null : app.customer_id)}
                            className="px-2 py-1.5 bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs rounded-lg border border-slate-700 transition-all"
                            title="View audit log"
                          >
                            📋 {app.audit_log.length}
                          </button>
                        )}
                        <button
                          onClick={() => onSelect(app.customer_id, app.name, app.features)}
                          className="px-4 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition-all border border-slate-700 hover:border-indigo-500"
                        >
                          <FileText size={13} /> Analyze
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expandable Audit Log Row */}
                  {expandedAudit === app.customer_id && app.audit_log && app.audit_log.length > 0 && (
                    <tr key={`${app.customer_id}-audit`} className="bg-slate-950/60">
                      <td colSpan={6} className="px-8 py-4">
                        <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">Decision Audit Log</p>
                        <div className="space-y-2">
                          {app.audit_log.map((entry: any, i: number) => (
                            <div key={i} className="flex items-start gap-4 text-xs">
                              <span className="text-slate-500 font-mono w-32 flex-shrink-0">{entry.timestamp}</span>
                              <span className={`font-bold flex-shrink-0 ${entry.status === 'Approved' ? 'text-emerald-400' : entry.status === 'Denied' ? 'text-red-400' : 'text-amber-400'}`}>{entry.status}</span>
                              <span className="text-slate-400">{entry.reason || '—'}</span>
                              <span className="text-slate-600 ml-auto flex-shrink-0">by {entry.analyst}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Decision Reason Modal */}
      {decisionModal && (
        <DecisionReasonModal
          status={decisionModal.newStatus}
          onConfirm={(reason) => {
            commitStatusChange(decisionModal.id, decisionModal.newStatus, reason);
            setDecisionModal(null);
          }}
          onCancel={() => setDecisionModal(null)}
        />
      )}

      {/* Notify Applicant Modal */}
      {notifyModal && (
        <NotifyApplicantModal
          customer={notifyModal}
          onClose={() => setNotifyModal(null)}
        />
      )}

      {showAddModal && <AddApplicantModal onClose={() => setShowAddModal(false)} onAdded={loadQueue} />}
      {showImportModal && <ImportCsvModal onClose={() => setShowImportModal(false)} onAnalyzeDirectly={(id, name, features) => {
        setShowImportModal(false);
        onSelect(id, name, features);
      }} />}
    </div>
  );
}

// --- Decision Reason Modal ---
const REASON_OPTIONS: Record<string, string[]> = {
  Approved: ['Standard Approval', 'Conditional Approval — Income Verified', 'Override Approval — Senior Review', 'Approved with Reduced Limit'],
  Denied: ['High Default Risk Score', 'Insufficient Monthly Income', 'Past Delinquency (90+ Days)', 'Excessive Debt Ratio', 'Policy Violation', 'Thin Credit File — Insufficient History', 'Fraud Suspicion — Referred for Review'],
};

function DecisionReasonModal({ status, onConfirm, onCancel }: { status: string; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = useState('');
  const options = REASON_OPTIONS[status] ?? [];
  const isApproved = status === 'Approved';

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className={`px-6 py-4 border-b border-slate-800 flex items-center justify-between ${isApproved ? 'bg-emerald-950/30' : 'bg-red-950/30'}`}>
          <div>
            <h3 className="text-base font-bold text-white">
              {isApproved ? '✅ Confirm Approval' : '❌ Confirm Denial'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">A decision reason is required for compliance audit.</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Decision Reason *</label>
            <div className="space-y-2">
              {options.map(opt => (
                <label key={opt} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${reason === opt ? (isApproved ? 'border-emerald-500/50 bg-emerald-950/30' : 'border-red-500/50 bg-red-950/30') : 'border-slate-800 hover:border-slate-600'}`}>
                  <input type="radio" name="reason" value={opt} checked={reason === opt} onChange={() => setReason(opt)} className="accent-indigo-500" />
                  <span className="text-sm text-slate-300">{opt}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors">Cancel</button>
            <button
              onClick={() => reason && onConfirm(reason)}
              disabled={!reason}
              className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all disabled:opacity-40 ${isApproved ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
            >
              Confirm {status}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


// --- Notify Applicant Modal ---
function NotifyApplicantModal({ customer, onClose }: { customer: QueueCustomer; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const isApproved = customer.status === 'Approved';
  const lastAudit = customer.audit_log?.[customer.audit_log.length - 1];

  const emailMessage = isApproved
    ? `Subject: Your Loan Application ${customer.customer_id} has been Approved ✅\n\nDear ${customer.name},\n\nWe are pleased to inform you that your loan application (ID: ${customer.customer_id}) for $${customer.loan_amount.toLocaleString()} has been approved.\n\nReason: ${lastAudit?.reason ?? 'Standard Approval'}\n\nOur team will contact you shortly with the next steps for disbursement.\n\nThank you for choosing CreditLens Financial Services.\n\nWarm regards,\nCredit Operations Team`
    : `Subject: Update on your Loan Application ${customer.customer_id}\n\nDear ${customer.name},\n\nThank you for your application (ID: ${customer.customer_id}) for $${customer.loan_amount.toLocaleString()}.\n\nAfter careful review, we are unable to approve your application at this time.\n\nPrimary reason: ${lastAudit?.reason ?? 'Credit risk assessment'}\n\nYou have the right to request the specific information that influenced this decision and to obtain a free copy of your credit report within 60 days.\n\nWe encourage you to reapply after addressing the above factors.\n\nRegards,\nCredit Operations Team`;

  const smsMessage = isApproved
    ? `CreditLens: Hi ${customer.name.split(' ')[0]}, great news! Your loan application ${customer.customer_id} ($${customer.loan_amount.toLocaleString()}) has been APPROVED. Our team will contact you shortly.`
    : `CreditLens: Hi ${customer.name.split(' ')[0]}, your loan application ${customer.customer_id} could not be approved at this time. Reason: ${lastAudit?.reason ?? 'Risk assessment'}. Reply HELP for more info.`;

  const message = channel === 'email' ? emailMessage : smsMessage;

  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className={`px-6 py-4 border-b border-slate-800 flex items-center justify-between ${isApproved ? 'bg-emerald-950/30' : 'bg-slate-950/30'}`}>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Bell size={16} className={isApproved ? 'text-emerald-400' : 'text-amber-400'} />
              Notify Applicant
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Send a decision notification to {customer.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </div>
        {!sent ? (
          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              {(['email', 'sms'] as const).map(ch => (
                <button key={ch} onClick={() => setChannel(ch)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition-all ${channel === ch ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}>
                  {ch === 'email' ? '📧 Email' : '📱 SMS'}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 flex gap-4">
              <span>To: <span className="text-slate-300">{customer.email || 'No email on file'}</span></span>
              {channel === 'sms' && <span>Phone: <span className="text-slate-300">{customer.phone || 'No phone on file'}</span></span>}
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-2">Message Preview</label>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 max-h-52 overflow-auto">
                <pre className="text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed font-sans">{message}</pre>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-colors">Skip</button>
              <button onClick={() => setSent(true)}
                className={`flex-1 px-4 py-2.5 text-sm font-bold rounded-lg transition-all ${isApproved ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white`}>
                Send {channel === 'email' ? 'Email' : 'SMS'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="text-white font-semibold">Notification Sent!</p>
            <p className="text-sm text-slate-400">{channel === 'email' ? 'Email' : 'SMS'} dispatched to {customer.name}.</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700 transition-all">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportCsvModal({ onClose, onAnalyzeDirectly }: { onClose: () => void, onAnalyzeDirectly: (id: string, name: string, features: any) => void }) {
  const [rowId, setRowId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract numbers from "APP-45000" or just "45000"
    const match = rowId.match(/\d+/);
    if (!match) {
      setError("Please enter a valid Application ID (e.g. APP-45000)");
      return;
    }
    
    const id = parseInt(match[0]);
    if (isNaN(id) || id < 0 || id > 149999) {
      setError("Application ID not found. Must be between APP-0 and APP-149999");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { importFromDataset } = await import('../api');
      const customer = await importFromDataset(id);
      onAnalyzeDirectly(customer.customer_id, customer.name, customer.features);
    } catch (e: any) {
      console.error(e);
      setError(e?.response?.data?.detail ?? "Failed to lookup application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Lookup Application</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleImport} className="p-6 space-y-4">
          <p className="text-sm text-slate-400">
            Enter a valid Application ID (from <strong>APP-0</strong> to <strong>APP-149999</strong>) to retrieve the historical loan record from the master database.
          </p>
          {error && <div className="text-xs text-red-400 bg-red-950/50 p-2 rounded border border-red-900/50">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Application ID</label>
            <input 
              type="text" 
              required 
              value={rowId} 
              onChange={e => setRowId(e.target.value)} 
              placeholder="e.g. APP-45000"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" 
            />
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-800 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={submitting || !rowId} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all disabled:opacity-50">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Lookup Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddApplicantModal({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    application_id: `CL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900000) + 100000)}`,
    name: '',
    email: '',
    phone: '',
    loan_purpose: 'Personal',
    loan_amount: 25000,
    RevolvingUtilizationOfUnsecuredLines: 0.65,
    age: 38,
    'NumberOfTime30-59DaysPastDueNotWorse': 0,
    DebtRatio: 0.42,
    MonthlyIncome: 8500,
    NumberOfOpenCreditLinesAndLoans: 7,
    NumberOfTimes90DaysLate: 0,
    NumberRealEstateLoansOrLines: 1,
    'NumberOfTime60-89DaysPastDueNotWorse': 0,
    NumberOfDependents: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.application_id.trim()) {
      setError('Application ID is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await addApplicant({
        application_id: form.application_id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        loan_purpose: form.loan_purpose,
        loan_amount: form.loan_amount,
        features: {
          RevolvingUtilizationOfUnsecuredLines: form.RevolvingUtilizationOfUnsecuredLines,
          age: form.age,
          'NumberOfTime30-59DaysPastDueNotWorse': form['NumberOfTime30-59DaysPastDueNotWorse'],
          DebtRatio: form.DebtRatio,
          MonthlyIncome: form.MonthlyIncome,
          NumberOfOpenCreditLinesAndLoans: form.NumberOfOpenCreditLinesAndLoans,
          NumberOfTimes90DaysLate: form.NumberOfTimes90DaysLate,
          NumberRealEstateLoansOrLines: form.NumberRealEstateLoansOrLines,
          'NumberOfTime60-89DaysPastDueNotWorse': form['NumberOfTime60-89DaysPastDueNotWorse'],
          NumberOfDependents: form.NumberOfDependents,
          MonthlyDebt: form.DebtRatio * form.MonthlyIncome,
          IncomePerDependent: form.MonthlyIncome / (form.NumberOfDependents + 1),
          CombinedPastDue: form['NumberOfTime30-59DaysPastDueNotWorse'] + form['NumberOfTime60-89DaysPastDueNotWorse'] + form.NumberOfTimes90DaysLate,
          HasDependents: form.NumberOfDependents > 0 ? 1 : 0
        }
      });
      onAdded();
      onClose();
    } catch (e) {
      console.error(e);
      setError('Failed to submit application. Please try again.');
      setSubmitting(false);
    }
  };

  const inp = 'w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const lbl = 'block text-xs font-semibold text-slate-400 uppercase mb-1';

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">New Loan Application</h3>
            <p className="text-xs text-slate-500 mt-0.5">All fields marked * are required</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-5">
          {error && <div className="text-xs text-red-400 bg-red-950/50 p-3 rounded-lg border border-red-900/50">{error}</div>}

          {/* Section: Identity */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">Application Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className={lbl}>Application ID *</label>
                <input type="text" required value={form.application_id} onChange={e => setForm({...form, application_id: e.target.value})} className={`${inp} font-mono`} placeholder="e.g. CL-2026-123456" />
              </div>
              <div className="col-span-1">
                <label className={lbl}>Loan Purpose</label>
                <select value={form.loan_purpose} onChange={e => setForm({...form, loan_purpose: e.target.value})} className={inp}>
                  {['Personal', 'Home Improvement', 'Business', 'Education', 'Medical', 'Debt Consolidation', 'Auto', 'Other'].map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Applicant Info */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">Applicant Information</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Full Name *</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inp} placeholder="e.g. Alex Sterling" />
              </div>
              <div>
                <label className={lbl}>Loan Amount ($) *</label>
                <input type="number" required value={form.loan_amount} onChange={e => setForm({...form, loan_amount: Number(e.target.value)})} className={inp} />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inp} placeholder="applicant@email.com" />
              </div>
              <div>
                <label className={lbl}>Phone</label>
                <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className={inp} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </div>

          {/* Section: Financial Profile */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">Financial Profile</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Monthly Income ($) *</label>
                <input type="number" required value={form.MonthlyIncome} onChange={e => setForm({...form, MonthlyIncome: Number(e.target.value)})} className={inp} />
              </div>
              <div>
                <label className={lbl}>Age *</label>
                <input type="number" required value={form.age} onChange={e => setForm({...form, age: Number(e.target.value)})} className={inp} />
              </div>
              <div>
                <label className={lbl}>Debt Ratio (0–1) *</label>
                <input type="number" step="0.01" min="0" max="100" required value={form.DebtRatio} onChange={e => setForm({...form, DebtRatio: Number(e.target.value)})} className={inp} />
              </div>
              <div>
                <label className={lbl}>Credit Utilization (0–1) *</label>
                <input type="number" step="0.01" min="0" max="1" required value={form.RevolvingUtilizationOfUnsecuredLines} onChange={e => setForm({...form, RevolvingUtilizationOfUnsecuredLines: Number(e.target.value)})} className={inp} />
              </div>
              <div>
                <label className={lbl}>Dependents</label>
                <input type="number" min="0" value={form.NumberOfDependents} onChange={e => setForm({...form, NumberOfDependents: Number(e.target.value)})} className={inp} />
              </div>
              <div>
                <label className={lbl}>Open Credit Lines</label>
                <input type="number" min="0" value={form.NumberOfOpenCreditLinesAndLoans} onChange={e => setForm({...form, NumberOfOpenCreditLinesAndLoans: Number(e.target.value)})} className={inp} />
              </div>
            </div>
          </div>

          {/* Section: Delinquency History */}
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-3">Delinquency History</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={lbl}>30–59 Days Late</label>
                <input type="number" min="0" value={form['NumberOfTime30-59DaysPastDueNotWorse']} onChange={e => setForm({...form, 'NumberOfTime30-59DaysPastDueNotWorse': Number(e.target.value)})} className={inp} />
              </div>
              <div>
                <label className={lbl}>60–89 Days Late</label>
                <input type="number" min="0" value={form['NumberOfTime60-89DaysPastDueNotWorse']} onChange={e => setForm({...form, 'NumberOfTime60-89DaysPastDueNotWorse': Number(e.target.value)})} className={inp} />
              </div>
              <div>
                <label className={lbl}>90+ Days Late</label>
                <input type="number" min="0" value={form.NumberOfTimes90DaysLate} onChange={e => setForm({...form, NumberOfTimes90DaysLate: Number(e.target.value)})} className={inp} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all disabled:opacity-50">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


