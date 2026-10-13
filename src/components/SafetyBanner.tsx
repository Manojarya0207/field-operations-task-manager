import React from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface SafetyBannerProps {
  category?: string;
  severity?: string;
  compact?: boolean;
}

export function SafetyBanner({ category, severity, compact = false }: SafetyBannerProps) {
  const isCritical =
    category === 'Electrical' || severity === 'Critical';

  if (!isCritical) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
        <ShieldAlert size={16} className="text-rose-600 shrink-0" />
        <span>Safety-Critical Isolation Protocol Active · Do not bypass safety interlocks.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
      <div className="flex gap-3">
        <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 h-fit">
          <ShieldAlert size={20} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
            Mandatory Equipment Safety Protocol
            <span className="text-[10px] uppercase tracking-wider bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded font-mono font-bold">
              High Voltage / Lab Hazard
            </span>
          </h4>
          <p className="text-xs text-rose-800 leading-relaxed">
            Safety-critical electrical and laboratory equipment issues must be isolated from mains power immediately.
            Under no circumstances should safety interlocks or protective thermal trips be bypassed. Document the isolation
            step and escalate directly to the institutional electrician or vendor technical lead.
          </p>
        </div>
      </div>
    </div>
  );
}
