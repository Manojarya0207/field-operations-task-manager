import React, { useEffect, useState } from 'react';
import {
  ReceiptIndianRupee,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  Eye,
  CreditCard,
  Wallet,
  ShieldCheck,
  FileText,
  Building,
} from 'lucide-react';
import { api, formatINR, formatDate, formatDateTime, uploadAttachment } from '../api';
import {
  Expense,
  ExpenseCategory,
  PaymentSource,
  CompanyAdvance,
  Institution,
  FieldVisit,
  Task,
} from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ReceiptViewerModal } from '../components/ReceiptViewerModal';

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [advances, setAdvances] = useState<CompanyAdvance[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentSourceFilter, setPaymentSourceFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [decisionModalExpense, setDecisionModalExpense] = useState<Expense | null>(null);
  const [decisionType, setDecisionType] = useState<'Approved' | 'Rejected'>('Approved');
  const [decisionReason, setDecisionReason] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (categoryFilter) queryParams.set('category', categoryFilter);
      if (statusFilter) queryParams.set('status', statusFilter);
      if (paymentSourceFilter) queryParams.set('payment_source', paymentSourceFilter);

      const [expRes, advRes, instRes, visRes, taskRes] = await Promise.all([
        api<Expense[]>(`/expenses?${queryParams.toString()}`),
        api<CompanyAdvance[]>('/advances'),
        api<Institution[]>('/institutions'),
        api<FieldVisit[]>('/visits'),
        api<Task[]>('/tasks'),
      ]);

      setExpenses(expRes);
      setAdvances(advRes);
      setInstitutions(instRes);
      setVisits(visRes);
      setTasks(taskRes);
    } catch (err: any) {
      alert(`Error loading expenses: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, categoryFilter, statusFilter, paymentSourceFilter]);

  // Calculations for double-counting safeguards
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTotal = expenses
    .filter((e) => e.expense_date.startsWith(todayStr))
    .reduce((sum, e) => sum + e.amount_paise, 0);

  // Strictly employee personal funds awaiting reimbursement (Submitted or Approved)
  const personalAwaitingReimbursement = expenses
    .filter(
      (e) =>
        e.payment_source === 'Employee personal funds' &&
        ['Submitted', 'Approved'].includes(e.approval_status)
    )
    .reduce((sum, e) => sum + e.reimbursement_paise, 0);

  // Approved awaiting final cash settlement
  const approvedAwaitingSettlement = expenses
    .filter(
      (e) =>
        e.approval_status === 'Approved' && e.payment_source === 'Employee personal funds'
    )
    .reduce((sum, e) => sum + e.reimbursement_paise, 0);

  // Total company advances balance remaining
  const totalAdvancesRemaining = advances.reduce(
    (sum, a) => sum + a.remaining_paise,
    0
  );

  const missingReceiptsCount = expenses.filter(
    (e) => !e.receipt_path && e.amount_paise > 20000 // > ₹200
  ).length;

  const handleSubmitExpense = async (expense: Expense) => {
    try {
      await api(`/expenses/${expense.id}/submit`, { method: 'POST' });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModalExpense) return;

    try {
      await api(`/expenses/${decisionModalExpense.id}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision: decisionType,
          reason: decisionReason || undefined,
          approver_name: 'Lead Reviewer',
        }),
      });
      setDecisionModalExpense(null);
      setDecisionReason('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSettleExpense = async (expense: Expense) => {
    const confirmSettle = window.confirm(
      `Mark ${formatINR(expense.reimbursement_paise)} as fully settled and disbursed to employee?`
    );
    if (!confirmSettle) return;

    try {
      await api(`/expenses/${expense.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Settled via local cash/bank disbursement',
        }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ReceiptIndianRupee className="text-purple-600" /> Company Expense Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Exact paise tracking (INR), advance balances, and strict personal reimbursement safeguards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdvanceModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Wallet size={14} /> Record Advance
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Add Expense
          </button>
        </div>
      </div>

      {/* METRIC PILLS & DOUBLE COUNTING SAFEGUARD SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-400 text-xs font-medium mb-1">Today's Total Spend</div>
          <div className="text-xl font-bold text-slate-900">{formatINR(todayTotal)}</div>
          <div className="text-[11px] text-slate-400 mt-1">All payment sources</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-purple-600 text-xs font-semibold mb-1">Personal Reimbursement Pending</div>
          <div className="text-xl font-bold text-purple-700">
            {formatINR(personalAwaitingReimbursement)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {formatINR(approvedAwaitingSettlement)} approved for settlement
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-sky-600 text-xs font-semibold mb-1">Advances Remaining Balance</div>
          <div className="text-xl font-bold text-sky-700">
            {formatINR(totalAdvancesRemaining)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Does not count as employee claim</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 text-xs font-medium mb-1">Audit Safeguards</div>
          <div className="text-xl font-bold text-slate-800">
            {missingReceiptsCount > 0 ? `${missingReceiptsCount} missing` : 'All attached'}
          </div>
          <div className="text-[11px] text-amber-600 font-medium mt-1">
            {missingReceiptsCount > 0 ? 'Receipts missing > ₹200' : 'Receipt compliance complete'}
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search description, origin, destination..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-purple-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-purple-500 bg-white"
          >
            <option value="">All Categories</option>
            {['Bus', 'Train', 'Cab', 'Fuel', 'Food', 'Accommodation', 'Parking', 'Toll', 'Materials', 'Courier', 'Other'].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              )
            )}
          </select>

          <select
            value={paymentSourceFilter}
            onChange={(e) => setPaymentSourceFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-purple-500 bg-white"
          >
            <option value="">All Payment Sources</option>
            <option value="Company cash">Company Cash</option>
            <option value="Company advance">Company Advance</option>
            <option value="Company card">Company Card</option>
            <option value="Employee personal funds">Employee Personal Funds</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-purple-500 bg-white"
          >
            <option value="">All Approval Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Settled">Settled</option>
          </select>
        </div>
      </div>

      {/* EXPENSE LEDGER TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading ledger from SQLite...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ReceiptIndianRupee size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No expense records found</p>
            <p className="text-xs text-slate-400">Record travel, food, or material costs logged during field operations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Date & Category</th>
                  <th className="py-3 px-4">Description & Trip</th>
                  <th className="py-3 px-4">Payment Source</th>
                  <th className="py-3 px-4">Amount (INR)</th>
                  <th className="py-3 px-4">Reimbursable</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Receipt</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{exp.category}</div>
                      <div className="text-[11px] text-slate-400">{formatDateTime(exp.expense_date)}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="text-slate-800 line-clamp-1">{exp.description || '—'}</div>
                      {(exp.origin || exp.destination) && (
                        <div className="text-[11px] text-slate-400 truncate">
                          Route: {exp.origin || 'Start'} → {exp.destination || 'End'}
                        </div>
                      )}
                      {exp.institution_name && (
                        <div className="text-[11px] text-emerald-700 font-medium truncate">
                          At: {exp.institution_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{exp.payment_source}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatINR(exp.amount_paise)}
                    </td>
                    <td className="py-3 px-4">
                      {exp.reimbursement_paise > 0 ? (
                        <span className="font-mono font-semibold text-purple-700">
                          {formatINR(exp.reimbursement_paise)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">₹0.00 (Company Paid)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge value={exp.approval_status} />
                      {exp.approval_reason && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">
                          {exp.approval_reason}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {exp.receipt_path ? (
                        <button
                          onClick={() => setPreviewReceiptUrl(exp.receipt_path!)}
                          className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800 font-semibold"
                        >
                          <Eye size={13} /> View
                        </button>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium">Missing</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {exp.approval_status === 'Draft' && (
                          <button
                            onClick={() => handleSubmitExpense(exp)}
                            className="px-2 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded text-[11px] font-semibold"
                          >
                            Submit
                          </button>
                        )}
                        {exp.approval_status === 'Submitted' && (
                          <button
                            onClick={() => {
                              setDecisionModalExpense(exp);
                              setDecisionType('Approved');
                            }}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                          >
                            Review
                          </button>
                        )}
                        {exp.approval_status === 'Approved' && exp.payment_source === 'Employee personal funds' && (
                          <button
                            onClick={() => handleSettleExpense(exp)}
                            className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-[11px] font-semibold"
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isAddModalOpen && (
        <Modal
          title="Add Expense Entry"
          description="Record an operational expense. Double-counting checks prevent company cards or advances from generating reimbursement claims."
          onClose={() => setIsAddModalOpen(false)}
          maxWidth="xl"
        >
          <ExpenseForm
            advances={advances}
            institutions={institutions}
            visits={visits}
            tasks={tasks}
            onSuccess={() => {
              setIsAddModalOpen(false);
              loadData();
            }}
            onCancel={() => setIsAddModalOpen(false)}
          />
        </Modal>
      )}

      {/* RECORD COMPANY ADVANCE MODAL */}
      {isAdvanceModalOpen && (
        <Modal
          title="Record Company Tour Advance"
          description="Log funds received in advance for field travel. Advances are deducted automatically when selected during expense entry."
          onClose={() => setIsAdvanceModalOpen(false)}
          maxWidth="md"
        >
          <AdvanceForm
            onSuccess={() => {
              setIsAdvanceModalOpen(false);
              loadData();
            }}
            onCancel={() => setIsAdvanceModalOpen(false)}
          />
        </Modal>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {previewReceiptUrl && (
        <ReceiptViewerModal
          url={previewReceiptUrl}
          onClose={() => setPreviewReceiptUrl(null)}
        />
      )}

      {/* DECISION REVIEW MODAL */}
      {decisionModalExpense && (
        <Modal
          title={`Expense Approval Decision`}
          description={`Claim: ${formatINR(decisionModalExpense.amount_paise)} · ${decisionModalExpense.category}`}
          onClose={() => setDecisionModalExpense(null)}
          maxWidth="md"
        >
          <form onSubmit={handleDecisionSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Decision *</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    checked={decisionType === 'Approved'}
                    onChange={() => setDecisionType('Approved')}
                  />
                  <span className="font-semibold text-emerald-700">Approve</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    checked={decisionType === 'Rejected'}
                    onChange={() => setDecisionType('Rejected')}
                  />
                  <span className="font-semibold text-rose-700">Reject</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reason / Notes</label>
              <textarea
                rows={3}
                placeholder="Required if rejecting, or optional note for finance..."
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModalExpense(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg"
              >
                Record Decision
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ExpenseForm({
  advances,
  institutions,
  visits,
  tasks,
  onSuccess,
  onCancel,
}: {
  advances: CompanyAdvance[];
  institutions: Institution[];
  visits: FieldVisit[];
  tasks: Task[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentSource, setSelectedPaymentSource] = useState<PaymentSource>('Company advance');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amountRupees = parseFloat(formData.get('amount') as string);
    const amountPaise = Math.round(amountRupees * 100);

    const payload: Record<string, any> = {
      expense_date: formData.get('expense_date'),
      category: formData.get('category'),
      amount_paise: amountPaise,
      payment_source: formData.get('payment_source'),
      description: formData.get('description') || null,
      business_purpose: formData.get('business_purpose') || null,
      origin: formData.get('origin') || null,
      destination: formData.get('destination') || null,
      institution_id: formData.get('institution_id') || null,
      visit_id: formData.get('visit_id') || null,
      task_id: formData.get('task_id') || null,
      advance_id: formData.get('advance_id') || null,
      notes: formData.get('notes') || null,
    };

    try {
      const created = await api('/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // If user selected a receipt file, upload and link it
      if (receiptFile && created?.id) {
        await uploadAttachment(receiptFile, 'expenses', created.id);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense');
      setLoading(false);
    }
  };

  const nowDatetimeLocal = new Date().toISOString().slice(0, 16);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Expense Date & Time *</label>
          <input
            type="datetime-local"
            name="expense_date"
            required
            defaultValue={nowDatetimeLocal}
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Category *</label>
          <select name="category" required defaultValue="Bus" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            {['Bus', 'Train', 'Cab', 'Fuel', 'Food', 'Accommodation', 'Parking', 'Toll', 'Materials', 'Courier', 'Other'].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Amount (₹ INR) *</label>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Payment Source *</label>
          <select
            name="payment_source"
            required
            value={selectedPaymentSource}
            onChange={(e) => setSelectedPaymentSource(e.target.value as PaymentSource)}
            className="w-full p-2 border border-slate-200 rounded-lg bg-white"
          >
            <option value="Company advance">Company Advance</option>
            <option value="Employee personal funds">Employee Personal Funds (Reimbursable)</option>
            <option value="Company card">Company Card</option>
            <option value="Company cash">Company Cash</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* IF COMPANY ADVANCE, SELECT ADVANCE ID */}
      {selectedPaymentSource === 'Company advance' && (
        <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg space-y-1">
          <label className="block font-semibold text-sky-900 mb-1">Select Sanctioned Advance</label>
          <select name="advance_id" className="w-full p-2 border border-sky-300 rounded-lg bg-white">
            <option value="">Unlinked Advance Account</option>
            {advances.map((a) => (
              <option key={a.id} value={a.id}>
                {formatDate(a.received_date)} · Remaining: {formatINR(a.remaining_paise)}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-sky-700">
            Deducts from remaining company advance. Will not generate a personal reimbursement claim.
          </p>
        </div>
      )}

      {selectedPaymentSource === 'Employee personal funds' && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-[11px] text-purple-800 font-medium">
            Personal funds spent by employee. This entry will be routed to the Team Lead for approval and subsequent reimbursement payout.
          </p>
        </div>
      )}

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Description *</label>
        <input
          name="description"
          required
          placeholder="e.g. Bus fare Mandya to Mysore campus"
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Travel Origin</label>
          <input name="origin" placeholder="e.g. Bangalore Depot" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Travel Destination</label>
          <input name="destination" placeholder="e.g. Govt Polytechnic Mysore" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Related Institution</label>
          <select name="institution_id" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="">None / General</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Related Field Visit</label>
          <select name="visit_id" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="">None / Standalone</option>
            {visits.map((v) => (
              <option key={v.id} value={v.id}>
                {v.purpose} ({formatDate(v.planned_arrival)})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Receipt Attachment (Local Disk Storage)</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
          className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
        />
        <p className="text-[10px] text-slate-400 mt-0.5">Files stay strictly on your local disk.</p>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-xs"
        >
          {loading ? 'Recording...' : 'Save Expense'}
        </button>
      </div>
    </form>
  );
}

function AdvanceForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const amountRupees = parseFloat(formData.get('amount') as string);
    const amountPaise = Math.round(amountRupees * 100);

    try {
      await api('/advances', {
        method: 'POST',
        body: JSON.stringify({
          received_date: formData.get('received_date'),
          amount_paise: amountPaise,
          settlement_notes: formData.get('settlement_notes') || null,
        }),
      });
      onSuccess();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Date Received *</label>
        <input
          type="date"
          name="received_date"
          required
          defaultValue={todayStr}
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Advance Amount (₹ INR) *</label>
        <input
          type="number"
          name="amount"
          step="0.01"
          min="1"
          required
          placeholder="e.g. 5000.00"
          className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Sanction / Purpose Notes</label>
        <textarea
          name="settlement_notes"
          rows={3}
          placeholder="e.g. Sanctioned by Lead for Mysore-Mandya 3-day lab commissioning tour"
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs"
        >
          {loading ? 'Recording...' : 'Record Advance'}
        </button>
      </div>
    </form>
  );
}
