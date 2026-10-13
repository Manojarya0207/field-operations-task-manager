import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { api, formatDateTime } from '../api';
import { AuditLog } from '../types';
import { Modal } from '../components/Modal';

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const query = entityFilter ? `?entity_type=${encodeURIComponent(entityFilter)}` : '';
      const res = await api<AuditLog[]>(`/audit${query}`);
      setLogs(res);
    } catch (err: any) {
      alert(`Error loading audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [entityFilter]);

  const parseJson = (str?: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="text-slate-700" /> Append-Only Audit History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tamper-evident record of all operational entity mutations, approvals, and status changes.
          </p>
        </div>

        {/* Entity Filter */}
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-slate-500 bg-white"
        >
          <option value="">All Entity Types</option>
          <option value="tasks">Tasks</option>
          <option value="expenses">Expenses</option>
          <option value="issues">Technical Issues</option>
          <option value="field_visits">Field Visits</option>
          <option value="inventory_assets">Inventory Assets</option>
          <option value="installation_jobs">Installation Jobs</option>
          <option value="daily_reports">Daily Reports</option>
          <option value="backups">Backups</option>
        </select>
      </div>

      {/* LOGS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading audit records from SQLite...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <History size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No audit records found</p>
            <p className="text-xs text-slate-400">Actions taken in the workspace will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action & Entity</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 capitalize">{log.action}</div>
                      <div className="text-[11px] text-slate-400">
                        {log.entity_type} · ID: {log.entity_id?.slice(0, 10)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{log.user_name || 'System'}</span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                      {log.reason || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded text-[11px] font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INSPECT LOG MODAL */}
      {selectedLog && (
        <Modal
          title={`Audit Log Record: ${selectedLog.action}`}
          description={`Entity: ${selectedLog.entity_type} (${selectedLog.entity_id})`}
          onClose={() => setSelectedLog(null)}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block font-medium">Timestamp:</span>
                <span className="font-mono text-slate-800">{formatDateTime(selectedLog.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Actor / User:</span>
                <span className="font-semibold text-slate-800">{selectedLog.user_name || 'System'}</span>
              </div>
              {selectedLog.reason && (
                <div className="col-span-2">
                  <span className="text-slate-400 block font-medium">Reason:</span>
                  <span className="text-slate-700">{selectedLog.reason}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  Previous Values
                </h4>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 overflow-x-auto max-h-56">
                  {selectedLog.previous_values
                    ? JSON.stringify(parseJson(selectedLog.previous_values), null, 2)
                    : 'None (Initial Creation)'}
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider mb-1">
                  New Values
                </h4>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono text-[11px] text-slate-700 overflow-x-auto max-h-56">
                  {selectedLog.new_values
                    ? JSON.stringify(parseJson(selectedLog.new_values), null, 2)
                    : 'None (Deletion / Pure Action)'}
                </pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
