import React, { useEffect, useState } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Send,
  Building,
  Wrench,
  ReceiptIndianRupee,
  ShieldAlert,
  AlertTriangle,
  User,
  Check,
} from 'lucide-react';
import { api, formatINR, formatDate } from '../api';
import { Badge } from '../components/Badge';

export function DailyReportsPage() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Form states
  const [employeeName, setEmployeeName] = useState('Manoj S Arya');
  const [manualSummary, setManualSummary] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [recipient, setRecipient] = useState('Subramanya Sir');
  const [status, setStatus] = useState<'Draft' | 'Submitted'>('Draft');

  const loadReport = async () => {
    try {
      setLoading(true);
      setSaveStatus(null);
      const res = await api(`/reports/daily/${selectedDate}`);
      setReportData(res);

      if (res.report) {
        setEmployeeName(res.report.employee_name || 'Manoj S Arya');
        setManualSummary(res.report.manual_summary || '');
        setTomorrowPlan(res.report.tomorrow_plan || '');
        setRecipient(res.report.recipient || 'Subramanya Sir');
        setStatus(res.report.status || 'Draft');
      } else {
        setManualSummary('');
        setTomorrowPlan('');
        setStatus('Draft');
      }
    } catch (err: any) {
      alert(`Error loading daily report: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const handleSaveReport = async (submitNow = false) => {
    try {
      const targetStatus = submitNow ? 'Submitted' : status;
      await api(`/reports/daily/${selectedDate}`, {
        method: 'PUT',
        body: JSON.stringify({
          employee_name: employeeName,
          manual_summary: manualSummary,
          tomorrow_plan: tomorrowPlan,
          recipient,
          status: targetStatus,
        }),
      });
      setStatus(targetStatus);
      setSaveStatus(
        submitNow
          ? 'Report saved and marked as Submitted for manual sharing.'
          : 'Draft report successfully saved locally in SQLite.'
      );
      loadReport();
    } catch (err: any) {
      alert(`Failed to save report: ${err.message}`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyClipboard = () => {
    if (!reportData) return;

    const totalExpense = reportData.expenses.reduce((s: number, e: any) => s + e.amount_paise, 0);

    const text = `
*DAILY FIELD WORK REPORT · ${selectedDate}*
Technician: ${employeeName}
Recipient: ${recipient}
Status: ${status}

*1. TASKS SUMMARY:*
- Total Tasks: ${reportData.tasks.length}
- Completed: ${reportData.tasks.filter((t: any) => t.status === 'Completed').length}
- In Progress: ${reportData.tasks.filter((t: any) => t.status === 'In Progress').length}
- Blocked: ${reportData.tasks.filter((t: any) => t.status === 'Blocked').length}

*2. INSTITUTION & FIELD VISITS:*
${reportData.visits.map((v: any) => `• ${v.institution_name || 'Site'}: ${v.purpose} (${v.status})`).join('\n') || 'None'}

*3. EQUIPMENT & LAB WORK:*
- Equipment QA Tested: ${reportData.qaTested?.length || 0}
- Equipment Installed: ${reportData.installedAssets?.length || 0}

*4. TECHNICAL ISSUES ENCOUNTERED:*
${reportData.issues.map((i: any) => `• [${i.severity}] ${i.product_name || 'Item'}: ${i.symptoms} -> ${i.status}`).join('\n') || 'None'}

*5. DAILY EXPENSES:*
- Total Spend: ${formatINR(totalExpense)}
- Entries: ${reportData.expenses.map((e: any) => `${e.category} (${formatINR(e.amount_paise)})`).join(', ') || 'None'}

*6. TECHNICIAN SUMMARY:*
${manualSummary || 'No summary notes logged.'}

*7. TOMORROW'S PLAN:*
${tomorrowPlan || 'Follow up on active tasks and scheduled field visits.'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* HEADER & DATE SELECTOR (Hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-purple-600" /> Daily Work Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Generate factual daily work summaries derived directly from local SQLite records.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 text-xs">
            <Calendar size={14} className="text-slate-400 ml-1.5" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-none py-1 px-1.5 text-xs font-semibold focus:outline-none"
            />
          </div>

          <button
            onClick={handleCopyClipboard}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Copy formatted text summary to clipboard"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer size={14} /> Print / PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
          Compiling report records for {selectedDate}...
        </div>
      ) : !reportData ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
          No records found.
        </div>
      ) : (
        <div className="space-y-6 print-area">
          {/* NOTICE BANNER */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center justify-between no-print">
            <div>
              <span className="font-bold">Offline & Local Record: </span>
              This daily report aggregates actual tasks, visits, equipment, and expenses recorded on this computer.
              Marking it submitted records manual out-of-band communication only.
            </div>
            <div className="font-mono text-xs font-bold uppercase ml-4 shrink-0">
              Status: <Badge value={status} />
            </div>
          </div>

          {/* REPORT DOCUMENT HEADER (Formatted for Print) */}
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
            <div className="border-b border-slate-200 pb-5 flex flex-col sm:flex-row justify-between sm:items-start gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-sky-700 block mb-1">
                  Field Operations & Technical Services
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Daily Field Work Report
                </h2>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Report Date: {formatDate(selectedDate)} ({selectedDate})
                </p>
              </div>

              <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
                <div>
                  <span className="text-slate-400">Technician: </span>
                  <span className="font-bold text-slate-900">{employeeName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Recipient: </span>
                  <span className="font-semibold text-slate-800">{recipient}</span>
                </div>
                <div>
                  <span className="text-slate-400">Review Status: </span>
                  <Badge value={reportData.report?.review_status || 'Not reviewed'} />
                </div>
              </div>
            </div>

            {/* KEY METRICS SUMMARY ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-medium">Tasks Total</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  {reportData.tasks.length}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">
                  {reportData.tasks.filter((t: any) => t.status === 'Completed').length} completed
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-medium">Field Visits</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  {reportData.visits.length}
                </span>
                <span className="text-[10px] text-slate-500">
                  {reportData.visits.filter((v: any) => v.status === 'Completed').length} finished
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-medium">Issues Encountered</span>
                <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                  {reportData.issues.length}
                </span>
                <span className="text-[10px] text-rose-600 font-semibold">
                  {reportData.issues.filter((i: any) => i.severity === 'Critical').length} critical
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-400 block font-medium">Expenses Logged</span>
                <span className="text-lg font-bold text-purple-700 mt-0.5 block">
                  {formatINR(reportData.expenses.reduce((s: number, e: any) => s + e.amount_paise, 0))}
                </span>
                <span className="text-[10px] text-slate-400">
                  {reportData.expenses.length} claims
                </span>
              </div>
            </div>

            {/* SECTION 1: TASKS DETAILS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-sky-600" />
                1. Tasks Assigned & Completed
              </h3>

              {reportData.tasks.length ? (
                <div className="space-y-2">
                  {reportData.tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 text-xs flex justify-between items-start gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{task.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {task.institution_name ? `Site: ${task.institution_name} · ` : ''}
                          Deliverable: {task.expected_deliverable || 'Standard field completion'}
                        </div>
                        {task.blocker_description && (
                          <div className="text-[11px] text-rose-600 font-semibold">
                            Blocker: {task.blocker_description}
                          </div>
                        )}
                        {task.progress_notes && (
                          <div className="text-[11px] text-slate-600 italic">
                            Notes: {task.progress_notes}
                          </div>
                        )}
                      </div>
                      <Badge value={task.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No tasks logged for this date.</p>
              )}
            </div>

            {/* SECTION 2: FIELD VISITS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <Building size={14} className="text-emerald-600" />
                2. Institutions & Vendor Visits
              </h3>

              {reportData.visits.length ? (
                <div className="space-y-2">
                  {reportData.visits.map((v: any) => (
                    <div
                      key={v.id}
                      className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-900">
                            {v.institution_name || v.vendor_name || 'Field Site Visit'}
                          </div>
                          <div className="text-[11px] text-emerald-800 font-medium">
                            Purpose: {v.purpose}
                          </div>
                        </div>
                        <Badge value={v.status} />
                      </div>
                      {v.equipment_handled && (
                        <p className="text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700">Equipment Handled: </span>
                          {v.equipment_handled}
                        </p>
                      )}
                      {v.work_performed && (
                        <p className="text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-700">Work Performed: </span>
                          {v.work_performed}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No field visits conducted on this date.</p>
              )}
            </div>

            {/* SECTION 3: TECHNICAL ISSUES & FAULTS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-rose-600" />
                3. Technical Faults & Safety Issues Reported
              </h3>

              {reportData.issues.length ? (
                <div className="space-y-2">
                  {reportData.issues.map((i: any) => (
                    <div
                      key={i.id}
                      className="p-3 bg-slate-50/70 rounded-lg border border-slate-200 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-900">
                            {i.product_name || 'Equipment'} · {i.category}
                          </div>
                          <p className="text-slate-700 mt-0.5">{i.symptoms}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge value={i.severity} />
                          <Badge value={i.status} />
                        </div>
                      </div>
                      {i.resolution_notes && (
                        <div className="text-[11px] text-emerald-700 font-medium pt-1">
                          Fix: {i.resolution_notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No technical issues logged on this date.</p>
              )}
            </div>

            {/* SECTION 4: EXPENSES & RECEIPTS */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                <ReceiptIndianRupee size={14} className="text-purple-600" />
                4. Field Expenses Logged
              </h3>

              {reportData.expenses.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase">
                        <th className="py-1.5">Category</th>
                        <th className="py-1.5">Description</th>
                        <th className="py-1.5">Payment Source</th>
                        <th className="py-1.5 font-mono text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.expenses.map((e: any) => (
                        <tr key={e.id}>
                          <td className="py-2 font-medium">{e.category}</td>
                          <td className="py-2 text-slate-600">{e.description}</td>
                          <td className="py-2 text-slate-500">{e.payment_source}</td>
                          <td className="py-2 font-mono font-bold text-right">
                            {formatINR(e.amount_paise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No expenses logged for this date.</p>
              )}
            </div>

            {/* SECTION 5: TECHNICIAN SUMMARY & TOMORROW'S PLAN */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                5. Technician Summary & Tomorrow's Plan
              </h3>

              <div className="space-y-3 no-print">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee Name *
                  </label>
                  <input
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manual Work Summary / Observations
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Summary of daily highlights, institution feedback, critical blockers..."
                    value={manualSummary}
                    onChange={(e) => setManualSummary(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tomorrow's Work Plan
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Planned visits, pending calibrations, spare parts to bring from depot..."
                    value={tomorrowPlan}
                    onChange={(e) => setTomorrowPlan(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Intended Recipient (Team Lead / Operations Manager)
                  </label>
                  <input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                {saveStatus && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold">
                    {saveStatus}
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => handleSaveReport(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors"
                  >
                    Save Local Draft
                  </button>
                  <button
                    onClick={() => handleSaveReport(true)}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Send size={14} /> Mark Submitted for Sharing
                  </button>
                </div>
              </div>

              {/* PRINT DISPLAY FOR SUMMARY & TOMORROW'S PLAN */}
              <div className="hidden print:block space-y-4">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase mb-1">Work Summary:</h4>
                  <p className="p-3 bg-slate-50 rounded border border-slate-200 leading-relaxed whitespace-pre-wrap">
                    {manualSummary || 'No manual summary recorded.'}
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs uppercase mb-1">Tomorrow's Plan:</h4>
                  <p className="p-3 bg-slate-50 rounded border border-slate-200 leading-relaxed whitespace-pre-wrap">
                    {tomorrowPlan || 'Follow up on pending assignments.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
