import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Building,
  Calendar,
  User,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Send,
  Eye,
  FileCheck,
  Zap,
} from 'lucide-react';
import { api, formatDate, formatDateTime } from '../api';
import {
  TechnicalIssue,
  IssueCategory,
  IssueSeverity,
  ResolutionResponsibility,
  IssueStatus,
  Institution,
  FieldVisit,
  Task,
} from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { SafetyBanner } from '../components/SafetyBanner';

export function IssuesPage() {
  const [issues, setIssues] = useState<TechnicalIssue[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<TechnicalIssue | null>(null);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [troubleshootComment, setTroubleshootComment] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [validationResults, setValidationResults] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (statusFilter) queryParams.set('status', statusFilter);
      if (severityFilter) queryParams.set('severity', severityFilter);
      if (categoryFilter) queryParams.set('category', categoryFilter);

      const [issRes, instRes, visRes, taskRes] = await Promise.all([
        api<TechnicalIssue[]>(`/issues?${queryParams.toString()}`),
        api<Institution[]>('/institutions'),
        api<FieldVisit[]>('/visits'),
        api<Task[]>('/tasks'),
      ]);

      setIssues(issRes);
      setInstitutions(instRes);
      setVisits(visRes);
      setTasks(taskRes);
    } catch (err: any) {
      alert(`Error loading issues: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, severityFilter, categoryFilter]);

  const openIssueDetails = async (issue: TechnicalIssue) => {
    try {
      const detailed = await api<TechnicalIssue>(`/issues/${issue.id}`);
      setSelectedIssue(detailed);
    } catch {
      setSelectedIssue(issue);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !troubleshootComment.trim()) return;

    try {
      await api(`/issues/${selectedIssue.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment: troubleshootComment.trim() }),
      });
      setTroubleshootComment('');
      openIssueDetails(selectedIssue);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    if (!resolutionNotes.trim() || !validationResults.trim()) {
      alert('Quality Rule: Both Resolution Notes and Validation Results are required before closing an issue.');
      return;
    }

    try {
      await api(`/issues/${selectedIssue.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'Resolved',
          resolution_notes: resolutionNotes.trim(),
          validation_results: validationResults.trim(),
        }),
      });
      setIsResolveModalOpen(false);
      setResolutionNotes('');
      setValidationResults('');
      loadData();
      openIssueDetails(selectedIssue);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStatusChange = async (issue: TechnicalIssue, newStatus: IssueStatus) => {
    if (['Resolved', 'Closed'].includes(newStatus)) {
      setSelectedIssue(issue);
      setIsResolveModalOpen(true);
      return;
    }

    try {
      await api(`/issues/${issue.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
      if (selectedIssue?.id === issue.id) {
        openIssueDetails(issue);
      }
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
            <ShieldAlert className="text-rose-600" /> Technical Issues & Support Escalations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track hardware/electrical faults, mandatory resolution validations, and vendor assistance.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} /> Report Issue
        </button>
      </div>

      {/* SAFETY ISOLATION NOTICE BANNER */}
      <SafetyBanner
        severity="Critical"
        category="Electrical"
      />

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search symptoms, product, serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-rose-500"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-rose-500 bg-white"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical (Immediate Hazard)</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-rose-500 bg-white"
          >
            <option value="">All Categories</option>
            {[
              'Hardware', 'Electrical', 'Software', 'Connectivity',
              'Calibration', 'Missing Parts', 'Installation', 'Site Readiness',
              'User Training', 'Vendor Support', 'Other'
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-rose-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Triaged">Triaged</option>
            <option value="In Progress">In Progress</option>
            <option value="Waiting for Support">Waiting for Support</option>
            <option value="Waiting for Vendor">Waiting for Vendor</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      {/* ISSUES LIST */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading issues from SQLite...</div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShieldAlert size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No technical issues recorded</p>
            <p className="text-xs text-slate-400">All equipment operating within normal parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Severity & Product</th>
                  <th className="py-3 px-4">Symptoms & Site</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Responsibility</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issues.map((issue) => (
                  <tr
                    key={issue.id}
                    onClick={() => openIssueDetails(issue)}
                    className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                      issue.severity === 'Critical' ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Badge value={issue.severity} />
                        {issue.is_safety_critical === 1 && (
                          <span
                            title="Safety-Critical Equipment"
                            className="p-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold"
                          >
                            <Zap size={12} />
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 mt-1">
                        {issue.product_name || 'Equipment Unit'}
                      </div>
                      {issue.serial_number && (
                        <div className="text-[10px] font-mono text-slate-400">
                          SN: {issue.serial_number}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-medium text-slate-800 line-clamp-2 leading-relaxed">
                        {issue.symptoms}
                      </div>
                      {issue.institution_name && (
                        <div className="text-[11px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1 truncate">
                          <Building size={12} /> {issue.institution_name}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{issue.category}</span>
                      <div className="text-[10px] text-slate-400">{formatDate(issue.reported_date)}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-800 font-medium">{issue.responsibility}</div>
                      {issue.assigned_support && (
                        <div className="text-[11px] text-slate-400">
                          Assigned: {issue.assigned_support}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <Badge value={issue.status} />
                    </td>

                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {!['Resolved', 'Closed'].includes(issue.status) && (
                          <button
                            onClick={() => {
                              setSelectedIssue(issue);
                              setIsResolveModalOpen(true);
                            }}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-semibold"
                          >
                            Resolve
                          </button>
                        )}
                        <button
                          onClick={() => openIssueDetails(issue)}
                          className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded text-[11px] font-semibold"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ISSUE DETAIL MODAL */}
      {selectedIssue && (
        <Modal
          title={selectedIssue.product_name || 'Equipment Fault Report'}
          description={`Issue ID: ${selectedIssue.id} · Category: ${selectedIssue.category}`}
          onClose={() => setSelectedIssue(null)}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Critical Banner inside Modal */}
            {selectedIssue.is_safety_critical === 1 && (
              <SafetyBanner
                category={selectedIssue.category}
                severity={selectedIssue.severity}
              />
            )}

            {/* Status & Severity Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Status:</span>
                <Badge value={selectedIssue.status} size="md" />
                <Badge value={selectedIssue.severity} size="md" />
              </div>

              <div className="flex items-center gap-1.5">
                {['In Progress', 'Waiting for Support', 'Waiting for Vendor'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedIssue, st as IssueStatus)}
                    disabled={selectedIssue.status === st}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      selectedIssue.status === st
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Set {st}
                  </button>
                ))}
                {!['Resolved', 'Closed'].includes(selectedIssue.status) && (
                  <button
                    onClick={() => {
                      setIsResolveModalOpen(true);
                    }}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                  >
                    Resolve & Validate
                  </button>
                )}
              </div>
            </div>

            {/* Symptoms & Diagnostics */}
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  Symptoms & Malfunction
                </h4>
                <p className="p-3 bg-slate-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedIssue.symptoms}
                </p>
              </div>

              {selectedIssue.operational_impact && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                    Operational Impact
                  </h4>
                  <p className="p-3 bg-slate-50 rounded-lg leading-relaxed">
                    {selectedIssue.operational_impact}
                  </p>
                </div>
              )}

              {selectedIssue.root_cause && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                    Root Cause
                  </h4>
                  <p className="p-3 bg-slate-50 rounded-lg leading-relaxed">
                    {selectedIssue.root_cause}
                  </p>
                </div>
              )}

              {/* Resolution Notes & Validation Results (Mandatory for closure) */}
              {selectedIssue.resolution_notes && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                  <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> Resolution Notes
                  </h4>
                  <p className="text-emerald-800 leading-relaxed whitespace-pre-wrap">
                    {selectedIssue.resolution_notes}
                  </p>
                  {selectedIssue.validation_results && (
                    <div className="pt-2 border-t border-emerald-200">
                      <span className="font-bold text-emerald-900 block text-[11px] uppercase tracking-wider mb-0.5">
                        Validation & Verification Results:
                      </span>
                      <p className="text-emerald-800 leading-relaxed whitespace-pre-wrap">
                        {selectedIssue.validation_results}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Troubleshooting Comments Timeline */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <MessageSquare size={14} className="text-sky-600" />
                Troubleshooting Log & Comments
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedIssue.comments?.length ? (
                  selectedIssue.comments.map((c) => (
                    <div key={c.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-700">{c.author_name}</span>
                        <span>{formatDateTime(c.created_at)}</span>
                      </div>
                      <p className="text-slate-800">{c.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 italic">No troubleshooting entries yet.</p>
                )}
              </div>

              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add troubleshooting note or finding..."
                  value={troubleshootComment}
                  onChange={(e) => setTroubleshootComment(e.target.value)}
                  className="flex-1 p-2 border border-slate-200 rounded-lg focus:outline-rose-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-slate-900 text-white rounded-lg font-semibold hover:bg-slate-800"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* RESOLUTION & VALIDATION MODAL */}
      {isResolveModalOpen && selectedIssue && (
        <Modal
          title="Resolve & Validate Issue"
          description={`Quality Safeguard: Resolution notes and bench validation test results are required.`}
          onClose={() => setIsResolveModalOpen(false)}
          maxWidth="lg"
        >
          <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
              <p className="font-semibold flex items-center gap-1 mb-1">
                <FileCheck size={14} /> Quality Integrity Rule
              </p>
              <p className="text-[11px] leading-relaxed">
                An issue cannot be marked resolved or closed without documentation of both the exact fix implemented and the formal validation measurements proving normal safe operation.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Resolution Notes *</label>
              <textarea
                required
                rows={3}
                placeholder="Describe parts replaced, calibration shunts adjusted, wiring rerouted..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-emerald-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Validation & Test Results *</label>
              <textarea
                required
                rows={3}
                placeholder="Bench test duration, voltage/thermal readings, student experiment validation..."
                value={validationResults}
                onChange={(e) => setValidationResults(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
              >
                Confirm Resolution
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE ISSUE MODAL */}
      {isAddModalOpen && (
        <Modal
          title="Report Technical Issue"
          description="Log equipment malfunction or site failure discovered during field operations."
          onClose={() => setIsAddModalOpen(false)}
          maxWidth="xl"
        >
          <IssueForm
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
    </div>
  );
}

function IssueForm({
  institutions,
  visits,
  tasks,
  onSuccess,
  onCancel,
}: {
  institutions: Institution[];
  visits: FieldVisit[];
  tasks: Task[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory>('Hardware');
  const [selectedSeverity, setSelectedSeverity] = useState<IssueSeverity>('Medium');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};

    formData.forEach((value, key) => {
      if (value !== '') {
        data[key] = value;
      }
    });

    try {
      await api('/issues', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onSuccess();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const isSafetyCritical =
    selectedCategory === 'Electrical' || selectedSeverity === 'Critical';

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {isSafetyCritical && (
        <SafetyBanner
          category={selectedCategory}
          severity={selectedSeverity}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Reported Date *</label>
          <input
            type="date"
            name="reported_date"
            required
            defaultValue={todayStr}
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Category *</label>
          <select
            name="category"
            required
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as IssueCategory)}
            className="w-full p-2 border border-slate-200 rounded-lg bg-white"
          >
            {[
              'Hardware', 'Electrical', 'Software', 'Connectivity',
              'Calibration', 'Missing Parts', 'Installation', 'Site Readiness',
              'User Training', 'Vendor Support', 'Other'
            ].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Severity *</label>
          <select
            name="severity"
            required
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as IssueSeverity)}
            className="w-full p-2 border border-slate-200 rounded-lg bg-white"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical (Immediate Hazard)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
          <input name="product_name" placeholder="e.g. Optical Bench Spectrometer" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Model</label>
          <input name="model" placeholder="Model number" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Serial Number</label>
          <input name="serial_number" placeholder="Equipment serial barcode" className="w-full p-2 border border-slate-200 rounded-lg" />
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Symptoms of Problem *</label>
        <textarea
          name="symptoms"
          required
          rows={3}
          placeholder="Describe visible indicators, error codes, burning odors, or unresponsiveness..."
          className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-rose-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Resolution Responsibility *</label>
          <select name="responsibility" defaultValue="Can resolve independently" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="Can resolve independently">1. Can resolve independently</option>
            <option value="Can investigate but needs approval">2. Can investigate but needs approval</option>
            <option value="Needs another technician">3. Needs another technician</option>
            <option value="Needs vendor support">4. Needs vendor support</option>
            <option value="Needs team lead decision">5. Needs team lead decision</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Institution</label>
          <select name="institution_id" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="">Select Government School / College</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Troubleshooting Attempted</label>
        <textarea
          name="troubleshooting"
          rows={2}
          placeholder="Power cycling, fuse continuity check, cable swapping..."
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Assistance Required (if escalating)</label>
        <input
          name="assistance_required"
          placeholder="Specific parts, wiring diagrams, or vendor engineer on-site request..."
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
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
          className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs"
        >
          {loading ? 'Logging...' : 'Report Issue'}
        </button>
      </div>
    </form>
  );
}
