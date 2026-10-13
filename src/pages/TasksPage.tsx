import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  AlertCircle,
  Calendar,
  Building,
  User,
  ArrowRight,
  RotateCw,
  Send,
  CheckCircle2,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { api, formatDate, formatDateTime } from '../api';
import { Task, TaskPriority, TaskStatus, Institution, Vendor } from '../types';
import { Badge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'overdue' | 'today'>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isCarryForwardOpen, setIsCarryForwardOpen] = useState(false);
  const [progressNote, setProgressNote] = useState('');
  const [updateStatus, setUpdateStatus] = useState<TaskStatus | ''>('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('q', search);
      if (statusFilter) queryParams.set('status', statusFilter);
      if (priorityFilter) queryParams.set('priority', priorityFilter);
      if (dateFilter !== 'all') queryParams.set('filter', dateFilter);

      const [taskRes, instRes, venRes] = await Promise.all([
        api<Task[]>(`/tasks?${queryParams.toString()}`),
        api<Institution[]>('/institutions'),
        api<Vendor[]>('/vendors'),
      ]);

      setTasks(taskRes);
      setInstitutions(instRes);
      setVendors(venRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, priorityFilter, dateFilter]);

  const openTaskDetails = async (task: Task) => {
    try {
      const detailed = await api<Task>(`/tasks/${task.id}`);
      setSelectedTask(detailed);
    } catch {
      setSelectedTask(task);
    }
  };

  const handleCarryForward = async () => {
    try {
      const res = await api<{ count: number; targetDate: string }>('/tasks/carry-forward', {
        method: 'POST',
      });
      setIsCarryForwardOpen(false);
      alert(`Successfully carried forward ${res.count} unfinished tasks to ${res.targetDate}.`);
      loadData();
    } catch (err: any) {
      alert(`Error carrying forward tasks: ${err.message}`);
    }
  };

  const handleAddProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !progressNote.trim()) return;

    try {
      await api(`/tasks/${selectedTask.id}/updates`, {
        method: 'POST',
        body: JSON.stringify({
          note: progressNote.trim(),
          status: updateStatus || undefined,
        }),
      });
      setProgressNote('');
      setUpdateStatus('');
      setIsUpdateModalOpen(false);

      // Refresh task details and list
      const refreshed = await api<Task>(`/tasks/${selectedTask.id}`);
      setSelectedTask(refreshed);
      loadData();
    } catch (err: any) {
      alert(`Failed to add update: ${err.message}`);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'Blocked') {
      const reason = prompt('Please enter the blocker description or reason for pending:');
      if (!reason) return;
      try {
        await api(`/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'Blocked',
            blocker_description: reason,
            pending_reason: reason,
          }),
        });
        loadData();
        if (selectedTask?.id === task.id) {
          openTaskDetails(task);
        }
      } catch (err: any) {
        alert(err.message);
      }
      return;
    }

    if (newStatus === 'Completed') {
      const notes = prompt('Enter completion verification notes (optional):');
      try {
        await api(`/tasks/${task.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'Completed',
            completion_notes: notes || undefined,
          }),
        });
        loadData();
        if (selectedTask?.id === task.id) {
          openTaskDetails(task);
        }
      } catch (err: any) {
        alert(err.message);
      }
      return;
    }

    try {
      await api(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
      if (selectedTask?.id === task.id) {
        openTaskDetails(task);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || ['Completed', 'Cancelled'].includes(task.status)) return false;
    const today = new Date().toISOString().slice(0, 10);
    return task.due_date < today;
  };

  return (
    <div className="space-y-6">
      {/* HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="text-sky-600" /> My Tasks & Field Assignments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track daily assignments, pending work reasons, and timestamped progress history.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCarryForwardOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Carry forward all unfinished tasks to the next working day"
          >
            <RotateCw size={14} /> Carry Forward Pending
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Create Task
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks, deliverables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-sky-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-sky-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Blocked">Blocked</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-sky-500 bg-white"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Date Range Quick Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setDateFilter('all')}
              className={`flex-1 py-1 rounded-md text-center transition-colors ${
                dateFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : ''
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDateFilter('today')}
              className={`flex-1 py-1 rounded-md text-center transition-colors ${
                dateFilter === 'today' ? 'bg-white text-slate-900 shadow-xs font-semibold' : ''
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('overdue')}
              className={`flex-1 py-1 rounded-md text-center transition-colors ${
                dateFilter === 'overdue' ? 'bg-white text-rose-700 shadow-xs font-bold' : ''
              }`}
            >
              Overdue
            </button>
          </div>
        </div>
      </div>

      {/* TASKS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading tasks from SQLite...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckSquare size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No tasks match your criteria</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or create a new assignment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Task Details</th>
                  <th className="py-3 px-4">Institution / Deliverable</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                        overdue ? 'bg-rose-50/30' : ''
                      }`}
                      onClick={() => openTaskDetails(task)}
                    >
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 line-clamp-1">{task.title}</div>
                        {task.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {task.description}
                          </div>
                        )}
                        {task.blocker_description && (
                          <div className="text-[11px] text-rose-600 font-medium mt-0.5 flex items-center gap-1">
                            <AlertCircle size={12} /> Blocker: {task.blocker_description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium truncate max-w-[200px]">
                          {task.institution_name || 'General Field Assignment'}
                        </div>
                        {task.expected_deliverable && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            Deliverable: {task.expected_deliverable}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge value={task.priority} />
                      </td>
                      <td className="py-3 px-4">
                        <div className={`font-mono text-xs ${overdue ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                          {formatDate(task.due_date)}
                        </div>
                        {overdue && (
                          <span className="text-[10px] text-rose-600 font-semibold block">Overdue</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge value={task.status} />
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {task.status !== 'Completed' && (
                            <button
                              onClick={() => handleStatusChange(task, 'Completed')}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Mark Completed"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                          {task.status !== 'Blocked' && task.status !== 'Completed' && (
                            <button
                              onClick={() => handleStatusChange(task, 'Blocked')}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                              title="Mark Blocked"
                            >
                              <XCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => openTaskDetails(task)}
                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                            title="View Details"
                          >
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <Modal
          title={selectedTask.title}
          description={`Task ID: ${selectedTask.id} · Priority: ${selectedTask.priority}`}
          onClose={() => setSelectedTask(null)}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Status & Priority Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <Badge value={selectedTask.status} size="md" />
                <Badge value={selectedTask.priority} size="md" />
              </div>

              {/* Status transition quick buttons */}
              <div className="flex items-center gap-1.5">
                {['In Progress', 'Blocked', 'Completed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedTask, st as TaskStatus)}
                    disabled={selectedTask.status === st}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      selectedTask.status === st
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Set {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Description & Deliverable */}
            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  Description
                </h4>
                <p className="p-3 bg-slate-50 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'No description provided.'}
                </p>
              </div>

              {selectedTask.blocker_description && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                  <h4 className="font-bold flex items-center gap-1.5 mb-1">
                    <AlertCircle size={14} /> Blocker / Pending Work Reason
                  </h4>
                  <p>{selectedTask.blocker_description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block font-medium">Institution / Client:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTask.institution_name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Expected Deliverable:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTask.expected_deliverable || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Assigned By:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedTask.assigned_by || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Due Date:</span>
                  <span className="font-semibold text-slate-800">
                    {formatDate(selectedTask.due_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Updates Section */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-sky-600" />
                  Progress Notes & Audit History
                </h4>
                <button
                  onClick={() => setIsUpdateModalOpen(true)}
                  className="px-2.5 py-1 text-xs bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg font-semibold flex items-center gap-1"
                >
                  <Plus size={12} /> Add Update
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedTask.updates && selectedTask.updates.length > 0 ? (
                  selectedTask.updates.map((u) => (
                    <div key={u.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                      <div className="flex justify-between items-center text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-700">{u.user_name || 'Technician'}</span>
                        <span>{formatDateTime(u.created_at)}</span>
                      </div>
                      <p className="text-slate-800">{u.note}</p>
                      {u.status && (
                        <div className="pt-1">
                          <Badge value={u.status} />
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">No updates recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ADD PROGRESS UPDATE MODAL */}
      {isUpdateModalOpen && selectedTask && (
        <Modal
          title="Add Timestamped Progress Update"
          description={`Log notes and update status for: ${selectedTask.title}`}
          onClose={() => setIsUpdateModalOpen(false)}
          maxWidth="md"
        >
          <form onSubmit={handleAddProgressUpdate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Progress Note / Observations *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describe work completed, findings, or follow-up actions..."
                value={progressNote}
                onChange={(e) => setProgressNote(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Update Status (Optional)
              </label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value as TaskStatus)}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Keep current status ({selectedTask.status})</option>
                <option value="In Progress">In Progress</option>
                <option value="Blocked">Blocked</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700"
              >
                Save Update
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE TASK MODAL */}
      {isAddModalOpen && (
        <Modal
          title="Create New Task Assignment"
          description="Record an equipment task assigned by team lead or scheduled for field operations."
          onClose={() => setIsAddModalOpen(false)}
          maxWidth="xl"
        >
          <TaskForm
            institutions={institutions}
            vendors={vendors}
            onSuccess={() => {
              setIsAddModalOpen(false);
              loadData();
            }}
            onCancel={() => setIsAddModalOpen(false)}
          />
        </Modal>
      )}

      {/* CARRY FORWARD CONFIRM DIALOG */}
      {isCarryForwardOpen && (
        <ConfirmDialog
          title="Carry Forward Unfinished Tasks"
          message="This will reschedule all unfinished (Assigned, In Progress, Blocked) tasks to the next working day, append a timestamped progress audit note, and preserve the original assignment record. Do you wish to proceed?"
          confirmLabel="Carry Forward"
          onConfirm={handleCarryForward}
          onCancel={() => setIsCarryForwardOpen(false)}
        />
      )}
    </div>
  );
}

function TaskForm({
  institutions,
  vendors,
  onSuccess,
  onCancel,
}: {
  institutions: Institution[];
  vendors: Vendor[];
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
      await api('/tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Task Title *</label>
        <input
          name="title"
          required
          placeholder="e.g. Install & calibrate 12 Digital Storage Oscilloscopes"
          className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
        />
      </div>

      <div>
        <label className="block font-semibold text-slate-700 mb-1">Description</label>
        <textarea
          name="description"
          rows={3}
          placeholder="Scope of work, test parameters, components supplied..."
          className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Assigned By</label>
          <input
            name="assigned_by"
            placeholder="Team Lead Name"
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Assigned To</label>
          <input
            name="assigned_to"
            placeholder="Technician Name"
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Priority *</label>
          <select name="priority" defaultValue="Medium" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Assignment Date</label>
          <input
            type="date"
            name="assignment_date"
            defaultValue={todayStr}
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Due Date</label>
          <input
            type="date"
            name="due_date"
            defaultValue={todayStr}
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Institution</label>
          <select name="institution_id" className="w-full p-2 border border-slate-200 rounded-lg bg-white">
            <option value="">None / Internal Depot</option>
            {institutions.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold text-slate-700 mb-1">Expected Deliverable</label>
          <input
            name="expected_deliverable"
            placeholder="e.g. Signed installation report & calibration sheet"
            className="w-full p-2 border border-slate-200 rounded-lg"
          />
        </div>
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
          {loading ? 'Saving...' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
