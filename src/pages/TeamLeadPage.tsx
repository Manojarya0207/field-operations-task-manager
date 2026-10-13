import React, { useEffect, useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  FileText,
  ReceiptIndianRupee,
  ShieldAlert,
  Download,
  AlertTriangle,
  Clock,
  Printer,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react';
import { api, formatINR, formatDate, formatDateTime } from '../api';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function TeamLeadPage() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Review modal
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<'Reviewed' | 'Clarification requested'>('Reviewed');
  const [reviewComments, setReviewComments] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api('/team-lead/summary');
      setSummary(res);
    } catch (err: any) {
      alert(`Error loading team lead summary: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExpenseDecision = async (expenseId: string, decision: 'Approved' | 'Rejected') => {
    const reason = prompt(`Enter reason for ${decision} (optional):`);
    try {
      await api(`/expenses/${expenseId}/decision`, {
        method: 'POST',
        body: JSON.stringify({
          decision,
          reason: reason || undefined,
          approver_name: 'Lead Reviewer',
        }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReportReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    try {
      await api(`/reports/daily/${selectedReport.report_date}/review`, {
        method: 'POST',
        body: JSON.stringify({
          reviewer_name: 'Sunil Verma (Team Lead)',
          status: reviewStatus,
          comments: reviewComments || 'Reviewed and confirmed.',
        }),
      });
      setSelectedReport(null);
      setReviewComments('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownloadCsv = (entity: string) => {
    window.open(`/api/export/csv/${entity}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="text-slate-800" /> Team Lead Workspace · Local Mode
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Simulate or record offline supervisor approvals, task dispatches, and daily report sign-offs.
          </p>
        </div>

        {/* CSV EXPORTS TOOLBAR */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Download size={13} /> Export CSV:
          </span>
          {['tasks', 'expenses', 'issues', 'visits', 'inventory'].map((entity) => (
            <button
              key={entity}
              onClick={() => handleDownloadCsv(entity)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg capitalize transition-colors shadow-2xs cursor-pointer"
            >
              {entity}
            </button>
          ))}
        </div>
      </div>

      {/* LOCAL NOTICE */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs">
        <p className="font-bold text-slate-900 mb-0.5">Local Records Notice</p>
        These review actions and approval states are recorded locally in your computer’s SQLite database.
        They reflect actions communicated manually via phone, WhatsApp, or formal documentation, and do not connect to remote servers.
      </div>

      {loading || !summary ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
          Loading workspace summaries...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PENDING EXPENSE APPROVALS */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ReceiptIndianRupee size={16} className="text-purple-600" />
                Submitted Expense Claims Awaiting Decision ({summary.pendingExpenses.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {summary.pendingExpenses.length ? (
                summary.pendingExpenses.map((exp: any) => (
                  <div key={exp.id} className="py-3 text-xs flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">
                        {exp.category} · {formatINR(exp.amount_paise)}
                      </div>
                      <p className="text-slate-600">{exp.description}</p>
                      <div className="text-[11px] text-slate-400">
                        Source: {exp.payment_source} · Date: {formatDate(exp.expense_date)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleExpenseDecision(exp.id, 'Approved')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        onClick={() => handleExpenseDecision(exp.id, 'Rejected')}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No pending expense claims to review.
                </p>
              )}
            </div>
          </div>

          {/* UNREVIEWED DAILY WORK REPORTS */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText size={16} className="text-sky-600" />
                Submitted Daily Reports Awaiting Review ({summary.unreviewedReports.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {summary.unreviewedReports.length ? (
                summary.unreviewedReports.map((rep: any) => (
                  <div key={rep.id} className="py-3 text-xs flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900">
                        Date: {formatDate(rep.report_date)} ({rep.report_date})
                      </div>
                      <p className="text-slate-600 line-clamp-2">
                        {rep.manual_summary || 'No manual summary entered.'}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        Technician: {rep.employee_name} · Recipient: {rep.recipient}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedReport(rep);
                        setReviewStatus('Reviewed');
                      }}
                      className="px-3 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded font-semibold text-xs shrink-0 cursor-pointer"
                    >
                      Sign Off / Review
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No submitted reports awaiting review.
                </p>
              )}
            </div>
          </div>

          {/* CRITICAL ISSUES ESCALATED */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600" />
                Escalated Technical Issues Requiring Assistance ({summary.criticalIssues.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {summary.criticalIssues.length ? (
                summary.criticalIssues.map((iss: any) => (
                  <div key={iss.id} className="py-3 text-xs space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900">
                        {iss.product_name || 'Equipment'} · {iss.category}
                      </span>
                      <Badge value={iss.severity} />
                    </div>
                    <p className="text-slate-700">{iss.symptoms}</p>
                    <div className="text-[11px] text-rose-700 font-semibold">
                      Responsibility: {iss.responsibility}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No escalated issues requiring lead intervention.
                </p>
              )}
            </div>
          </div>

          {/* BLOCKED TASKS */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Blocked Tasks & External Dependencies ({summary.blockedTasks.length})
              </h3>
            </div>

            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {summary.blockedTasks.length ? (
                summary.blockedTasks.map((t: any) => (
                  <div key={t.id} className="py-3 text-xs space-y-1">
                    <div className="font-bold text-slate-900">{t.title}</div>
                    <p className="text-rose-700 font-medium">
                      Blocker: {t.blocker_description || t.pending_reason}
                    </p>
                    <div className="text-[11px] text-slate-400">
                      Site: {t.institution_name || 'Field Depot'} · Due: {formatDate(t.due_date)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  No tasks currently flagged as blocked.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REPORT REVIEW MODAL */}
      {selectedReport && (
        <Modal
          title={`Review Daily Report: ${selectedReport.report_date}`}
          description={`Submitted by: ${selectedReport.employee_name}`}
          onClose={() => setSelectedReport(null)}
          maxWidth="md"
        >
          <form onSubmit={handleReportReviewSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Review Decision *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="rev_status"
                    checked={reviewStatus === 'Reviewed'}
                    onChange={() => setReviewStatus('Reviewed')}
                  />
                  <span className="font-semibold text-emerald-700">Acknowledge & Confirm</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="rev_status"
                    checked={reviewStatus === 'Clarification requested'}
                    onChange={() => setReviewStatus('Clarification requested')}
                  />
                  <span className="font-semibold text-amber-700">Request Clarification</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lead Feedback / Instructions</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Approved. Proceed with Bench 4 conduit check with the campus electrician tomorrow."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                Save Review Decision
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
