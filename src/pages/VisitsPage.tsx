import React, { useEffect, useState } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Building,
  Calendar,
  Clock,
  User,
  Phone,
  Wrench,
  AlertCircle,
  CheckCircle2,
  ReceiptIndianRupee,
  ShieldAlert,
  Paperclip,
  ArrowRight,
} from 'lucide-react';
import { api, formatDate, formatDateTime, formatINR } from '../api';
import { FieldVisit, VisitStatus, Institution, Vendor, Task } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';

export function VisitsPage() {
  const [visits, setVisits] = useState<FieldVisit[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<FieldVisit | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (statusFilter) queryParams.set('status', statusFilter);

      const [visitsRes, instRes, venRes, tasksRes] = await Promise.all([
        api<FieldVisit[]>(`/visits?${queryParams.toString()}`),
        api<Institution[]>('/institutions'),
        api<Vendor[]>('/vendors'),
        api<Task[]>('/tasks'),
      ]);

      setVisits(visitsRes);
      setInstitutions(instRes);
      setVendors(venRes);
      setTasks(tasksRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const openVisitDetails = async (visit: FieldVisit) => {
    try {
      const detailed = await api<FieldVisit>(`/visits/${visit.id}`);
      setSelectedVisit(detailed);
    } catch {
      setSelectedVisit(visit);
    }
  };

  const handleStatusChange = async (visit: FieldVisit, newStatus: VisitStatus) => {
    try {
      await api(`/visits/${visit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
      if (selectedVisit?.id === visit.id) {
        openVisitDetails(visit);
      }
    } catch (err: any) {
      alert(`Error updating visit status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="text-emerald-600" /> Field Visit Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track multi-site institution and vendor visits, equipment handled, and linked expenses.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={15} /> Log Field Visit
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by purpose, equipment handled, or findings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-emerald-500 bg-white"
        >
          <option value="">All Visit Statuses</option>
          <option value="Planned">Planned</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Blocked">Blocked</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* VISITS TIMELINE / LIST */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
            Loading field visits from SQLite...
          </div>
        ) : visits.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <MapPin size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No field visits recorded</p>
            <p className="text-xs text-slate-400">
              Log planned or completed trips to schools, colleges, or equipment suppliers.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visits.map((visit) => (
              <div
                key={visit.id}
                onClick={() => openVisitDetails(visit)}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge value={visit.status} />
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatDateTime(visit.planned_arrival)}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">
                      {visit.purpose}
                    </h3>
                    <div className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1.5">
                      <Building size={14} className="shrink-0" />
                      <span className="truncate">{visit.institution_name || visit.vendor_name || 'Site Visit'}</span>
                    </div>
                  </div>

                  {visit.equipment_handled && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider mb-0.5">
                        Equipment Handled:
                      </span>
                      <p className="line-clamp-2">{visit.equipment_handled}</p>
                    </div>
                  )}

                  {visit.work_performed && (
                    <div className="text-xs text-slate-500 line-clamp-2">
                      <span className="font-semibold text-slate-700">Work: </span>
                      {visit.work_performed}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate">
                    Contact: {visit.contact_person || 'Campus Coordinator'}
                  </span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1 shrink-0">
                    Details <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* VISIT DETAIL MODAL */}
      {selectedVisit && (
        <Modal
          title={selectedVisit.purpose}
          description={`Visit ID: ${selectedVisit.id}`}
          onClose={() => setSelectedVisit(null)}
          maxWidth="2xl"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Status & Timing Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Status:</span>
                <Badge value={selectedVisit.status} size="md" />
              </div>

              <div className="flex items-center gap-1.5">
                {['In Progress', 'Completed', 'Blocked'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedVisit, st as VisitStatus)}
                    disabled={selectedVisit.status === st}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      selectedVisit.status === st
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Set {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Institution & Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">Institution / Vendor:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedVisit.institution_name || selectedVisit.vendor_name || '—'}
                </span>
                <p className="text-slate-500 mt-1">{selectedVisit.address || 'Address not recorded'}</p>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Contact Person:</span>
                <span className="font-semibold text-slate-800">
                  {selectedVisit.contact_person || '—'}
                </span>
                {selectedVisit.phone && (
                  <div className="flex items-center gap-1 text-emerald-700 mt-1 font-mono">
                    <Phone size={13} /> {selectedVisit.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Work Performed & Results */}
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  Equipment Handled
                </h4>
                <p className="p-3 bg-slate-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedVisit.equipment_handled || 'No equipment details logged.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  Work Performed
                </h4>
                <p className="p-3 bg-slate-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedVisit.work_performed || 'No work report logged.'}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  Results & Observations
                </h4>
                <p className="p-3 bg-slate-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedVisit.results || 'None recorded.'}
                </p>
              </div>

              {selectedVisit.next_steps && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                    Next Steps
                  </h4>
                  <p className="p-3 bg-slate-50 rounded-lg leading-relaxed">
                    {selectedVisit.next_steps}
                  </p>
                </div>
              )}
            </div>

            {/* Linked Expenses and Issues */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1">
                  <ReceiptIndianRupee size={14} className="text-purple-600" /> Linked Expenses ({selectedVisit.expenses?.length || 0})
                </h4>
                <div className="space-y-1.5">
                  {selectedVisit.expenses?.length ? (
                    selectedVisit.expenses.map((e) => (
                      <div key={e.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex justify-between">
                        <span>{e.category} · {e.description}</span>
                        <span className="font-bold text-purple-700">{formatINR(e.amount_paise)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No expenses linked to this visit.</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-2 flex items-center gap-1">
                  <ShieldAlert size={14} className="text-rose-600" /> Linked Issues ({selectedVisit.issues?.length || 0})
                </h4>
                <div className="space-y-1.5">
                  {selectedVisit.issues?.length ? (
                    selectedVisit.issues.map((iss) => (
                      <div key={iss.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex justify-between items-center">
                        <span className="truncate">{iss.symptoms}</span>
                        <Badge value={iss.status} />
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No issues logged during this visit.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE VISIT MODAL */}
      {isAddModalOpen && (
        <Modal
          title="Log Field Visit"
          description="Record a visit to a government school, college, or vendor laboratory."
          onClose={() => setIsAddModalOpen(false)}
          maxWidth="xl"
        >
          <VisitForm
            institutions={institutions}
            vendors={vendors}
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

function VisitForm({
  institutions,
  vendors,
  tasks,
  onSuccess,
  onCancel,
}: {
  institutions: Institution[];
  vendors: Vendor[];
  tasks: Task[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};

    formData.forEach((value, key) => {
      if (value !== '') {
        data[key] = value;
      }
    });

    try {
      await api('/visits', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create visit');
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

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Visit Purpose *</label>
        <input
          name="purpose"
          required
          placeholder="e.g. Onsite calibration & validation of Physics lab meters"
          className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-emerald-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Vendor (if supplier visit)</label>
          <select name="vendor_id" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="">Select Equipment Vendor</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Contact Person</label>
          <input
            name="contact_person"
            placeholder="Headmaster / Lab In-charge"
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Phone</label>
          <input
            name="phone"
            placeholder="+91..."
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Planned Arrival</label>
          <input
            type="datetime-local"
            name="planned_arrival"
            defaultValue={nowDatetimeLocal}
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Actual Start</label>
          <input
            type="datetime-local"
            name="actual_start"
            defaultValue={nowDatetimeLocal}
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Status</label>
          <select name="status" defaultValue="Planned" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Blocked">Blocked</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Equipment Handled</label>
        <textarea
          name="equipment_handled"
          rows={2}
          placeholder="Model numbers, serial tags, lab workbenches involved..."
          className="w-full p-2 border border-slate-200 rounded-lg"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Work Performed / Observations</label>
        <textarea
          name="work_performed"
          rows={2}
          placeholder="Actions taken, tests conducted, staff demonstration details..."
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
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs"
        >
          {loading ? 'Saving...' : 'Record Visit'}
        </button>
      </div>
    </form>
  );
}
