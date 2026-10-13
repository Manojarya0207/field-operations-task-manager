import React from 'react';

interface BadgeProps {
  value: string;
  type?: 'status' | 'priority' | 'category' | 'qa' | 'stock' | 'source';
  size?: 'sm' | 'md';
}

export function Badge({ value, size = 'sm' }: BadgeProps) {
  const norm = (value || '').toLowerCase().trim();

  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';

  // Positive / Completed / Passed
  if (['completed', 'approved', 'passed', 'available', 'resolved', 'closed', 'settled'].includes(norm)) {
    colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/10';
  }
  // Warning / Blocked / Urgent / Failed / Critical / Quarantine
  else if (['blocked', 'urgent', 'critical', 'failed', 'quarantine', 'rejected'].includes(norm)) {
    colorClass = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-600/10 font-semibold';
  }
  // In Progress / Active / High / Submitted / Dispatched
  else if (['in progress', 'high', 'submitted', 'dispatched', 'validation', 'waiting for support', 'waiting for vendor'].includes(norm)) {
    colorClass = 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-600/10';
  }
  // Attention / Medium / Triaged / QA Pending / Reserved
  else if (['medium', 'triaged', 'qa pending', 'reserved', 'clarification requested'].includes(norm)) {
    colorClass = 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/10';
  }
  // Low / Planned / Draft / Received
  else if (['low', 'planned', 'draft', 'received', 'assigned'].includes(norm)) {
    colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${colorClass} ${sizeClass} whitespace-nowrap`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          ['completed', 'approved', 'passed', 'available', 'resolved', 'closed', 'settled'].includes(norm)
            ? 'bg-emerald-500'
            : ['blocked', 'urgent', 'critical', 'failed', 'quarantine', 'rejected'].includes(norm)
            ? 'bg-rose-500'
            : ['in progress', 'high', 'submitted', 'dispatched', 'validation'].includes(norm)
            ? 'bg-sky-500'
            : ['medium', 'triaged', 'qa pending'].includes(norm)
            ? 'bg-amber-500'
            : 'bg-slate-400'
        }`}
      />
      {value}
    </span>
  );
}
