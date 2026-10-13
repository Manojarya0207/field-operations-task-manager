import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Download,
  ShieldCheck,
  Clock,
  Database,
  ExternalLink,
} from 'lucide-react';
import { api, formatDateTime } from '../api';
import { BackupItem } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function BackupPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<BackupItem | null>(null);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await api<BackupItem[]>('/backups');
      setBackups(res);
    } catch (err: any) {
      alert(`Error loading backups: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setStatusMessage(null);
      const res = await api('/backups', { method: 'POST' });
      setStatusMessage(`Backup snapshot "${res.name}" successfully created.`);
      loadBackups();
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;

    try {
      setStatusMessage(null);
      const res = await api(`/backups/${restoreTarget.name}/restore`, { method: 'POST' });
      setRestoreTarget(null);
      setStatusMessage(res.message || 'Database restored successfully.');
      alert('Database restored successfully. The page will reload.');
      window.location.reload();
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <HardDrive className="text-slate-800" /> Local Backup & Recovery
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create atomic SQLite checkpoints and attachment snapshots. No cloud storage is ever used.
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <FolderArchive size={15} />
          {creating ? 'Creating Checkpoint...' : 'Create Backup Snapshot'}
        </button>
      </div>

      {/* DISK FAILURE EDUCATION NOTICE */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          Critical Operational Notice: External Media Redundancy
        </div>
        <p className="leading-relaxed">
          Backups created here are stored securely in your local application directory (<code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[11px]">~/Library/Application Support/FieldOperations/backups</code>).
          <strong> A backup kept on the same physical hard drive does not protect against physical disk failure.</strong>
          For true disaster recovery, routinely copy your backup folders to an external local USB drive or external hard disk.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} /> {statusMessage}
        </div>
      )}

      {/* BACKUP LIST */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Database size={16} className="text-sky-600" />
            Saved Local Snapshots ({backups.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Checking local backup directory...</div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <HardDrive size={36} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No backup snapshots created yet</p>
            <p className="text-xs text-slate-400">Click "Create Backup Snapshot" to create your first consistent snapshot.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {backups.map((item) => (
              <div key={item.name} className="p-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                <div className="space-y-1">
                  <div className="font-bold text-slate-900 font-mono text-sm">{item.name}</div>
                  <div className="text-slate-500 flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {formatDateTime(item.createdAt)}
                    </span>
                    <span>Database size: {formatBytes(item.dbSize)}</span>
                  </div>
                  {item.note && <p className="text-[11px] text-slate-400">{item.note}</p>}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => setRestoreTarget(item)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={13} /> Restore Snapshot
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIRM RESTORE DIALOG */}
      {restoreTarget && (
        <ConfirmDialog
          title="Restore Database & Attachments"
          message={`WARNING: Restoring from snapshot "${restoreTarget.name}" will completely overwrite active SQLite records and local files with the state from ${formatDateTime(
            restoreTarget.createdAt
          )}. All unsaved records added after this backup will be replaced. SQLite integrity check will be verified before replacement. Are you certain you want to restore?`}
          confirmLabel="Overwrite & Restore"
          isDestructive
          onConfirm={handleRestore}
          onCancel={() => setRestoreTarget(null)}
        />
      )}
    </div>
  );
}
