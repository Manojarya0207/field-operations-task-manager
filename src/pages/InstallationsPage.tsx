import React, { useEffect, useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';
import { api, formatDate, formatDateTime } from '../api';
import { InstallationJob, InstallationStatus, Institution } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function InstallationsPage() {
  const [jobs, setJobs] = useState<InstallationJob[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<InstallationJob | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [jobsRes, instRes] = await Promise.all([
        api<InstallationJob[]>('/installations'),
        api<Institution[]>('/institutions'),
      ]);
      setJobs(jobsRes);
      setInstitutions(instRes);
    } catch (err: any) {
      alert(`Error loading installation jobs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (job: InstallationJob, newStatus: InstallationStatus) => {
    try {
      await api(`/installations/${job.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
      if (selectedJob?.id === job.id) {
        setSelectedJob({ ...selectedJob, status: newStatus });
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
            <Wrench className="text-sky-600" /> Lab Installation & Handover Jobs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track workstation commissioning, site electrical readiness, validation results, and handover evidence.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} /> Create Installation Job
        </button>
      </div>

      {/* JOBS GRID */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            Loading installation records from SQLite...
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <Wrench size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No installation projects logged</p>
            <p className="text-xs text-slate-400">
              Create an installation job for school/college laboratory equipment commissioning.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-sky-300 transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge value={job.status} />
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatDate(job.created_at)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{job.title}</h3>
                    <div className="text-xs text-sky-700 font-medium mt-1 flex items-center gap-1.5">
                      <Building size={14} className="shrink-0" />
                      <span className="truncate">{job.institution_name || 'Government Campus'}</span>
                    </div>
                  </div>

                  {job.site_readiness && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider mb-0.5">
                        Site Readiness:
                      </span>
                      <p className="line-clamp-2">{job.site_readiness}</p>
                    </div>
                  )}

                  {job.validation_results && (
                    <div className="text-xs text-slate-500 line-clamp-2">
                      <span className="font-semibold text-slate-700">Validation: </span>
                      {job.validation_results}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate">
                    Warranty: {job.warranty_details || '1 Year Onsite'}
                  </span>
                  <span className="font-semibold text-sky-600 flex items-center gap-1 shrink-0">
                    View <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* JOB DETAIL MODAL */}
      {selectedJob && (
        <Modal
          title={selectedJob.title}
          description={`Installation Job ID: ${selectedJob.id}`}
          onClose={() => setSelectedJob(null)}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Status bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Status:</span>
                <Badge value={selectedJob.status} size="md" />
              </div>

              <div className="flex items-center gap-1.5">
                {['In Progress', 'Validation', 'Completed', 'Blocked'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedJob, st as InstallationStatus)}
                    disabled={selectedJob.status === st}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      selectedJob.status === st
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Set {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 block font-medium">Institution Campus:</span>
              <span className="font-bold text-slate-900 text-sm">
                {selectedJob.institution_name || 'Unassigned Campus'}
              </span>
            </div>

            {/* Site Readiness & Validation Results */}
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1 flex items-center gap-1.5">
                  <ClipboardCheck size={14} className="text-sky-600" /> Site Readiness & Electrical Grounding
                </h4>
                <p className="p-3 bg-slate-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedJob.site_readiness || 'No site readiness notes logged.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" /> Equipment Validation Results
                </h4>
                <p className="p-3 bg-slate-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedJob.validation_results || 'No validation test notes logged.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText size={14} className="text-purple-600" /> Handover Evidence & Signoff
                </h4>
                <p className="p-3 bg-slate-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedJob.handover_evidence || 'Handover documentation pending completion.'}
                </p>
              </div>

              {selectedJob.warranty_details && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-slate-600" /> Warranty Details
                  </h4>
                  <p className="p-3 bg-slate-50 rounded-lg leading-relaxed">
                    {selectedJob.warranty_details}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE JOB MODAL */}
      {isAddModalOpen && (
        <Modal
          title="Create Lab Installation Job"
          description="Commission laboratory workstations and test instruments at a government institution."
          onClose={() => setIsAddModalOpen(false)}
          maxWidth="xl"
        >
          <InstallationForm
            institutions={institutions}
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

function InstallationForm({
  institutions,
  onSuccess,
  onCancel,
}: {
  institutions: Institution[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

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
      await api('/installations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onSuccess();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <label className="block font-semibold text-slate-700 mb-1">Job Title *</label>
        <input
          name="title"
          required
          placeholder="e.g. Setup 24-Workstation Microcontroller Lab"
          className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Institution Campus *</label>
          <select name="institution_id" required className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="">Select Government School / College</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Status</label>
          <select name="status" defaultValue="Planned" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Validation">Validation</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Site Readiness Checklist & Electrical Grounding</label>
        <textarea
          name="site_readiness"
          rows={2}
          placeholder="Mains voltage, neutral-earth potential, stabilizer capacity, bench trunking..."
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Validation Results</label>
        <textarea
          name="validation_results"
          rows={2}
          placeholder="Channel calibration, student kit functional check..."
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Warranty Details</label>
        <input
          name="warranty_details"
          defaultValue="1 Year Comprehensive Onsite Warranty + 2 Years Free Calibration"
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
          className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg shadow-xs"
        >
          {loading ? 'Creating...' : 'Create Job'}
        </button>
      </div>
    </form>
  );
}
