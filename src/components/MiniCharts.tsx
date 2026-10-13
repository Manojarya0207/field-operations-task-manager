import React from 'react';
import { formatINR } from '../api';

interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

export function SimpleBarChart({
  data,
  isCurrency = false,
  height = 140,
}: {
  data: BarChartItem[];
  isCurrency?: boolean;
  height?: number;
}) {
  if (!data.length) {
    return <div className="text-xs text-slate-400 py-6 text-center">No data available</div>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2 pt-2">
      {data.map((item, idx) => {
        const pct = Math.min(100, Math.round((item.value / max) * 100));
        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="text-slate-500 font-mono">
                {isCurrency ? formatINR(item.value) : item.value}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${item.color || 'bg-sky-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutBreakdown({
  items,
  totalLabel,
}: {
  items: { label: string; count: number; color: string }[];
  totalLabel?: string;
}) {
  const total = items.reduce((acc, i) => acc + i.count, 0);

  if (total === 0) {
    return <div className="text-xs text-slate-400 py-6 text-center">No active items</div>;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
      <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {(() => {
            let accumulatedPercent = 0;
            return items.map((item, idx) => {
              const percent = (item.count / total) * 100;
              const strokeDasharray = `${percent} ${100 - percent}`;
              const strokeDashoffset = -accumulatedPercent;
              accumulatedPercent += percent;

              return (
                <circle
                  key={idx}
                  cx="18"
                  cy="18"
                  r="15.91549430918954"
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="3.2"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            });
          })()}
        </svg>
        <div className="absolute text-center">
          <span className="text-xl font-bold text-slate-800 block leading-tight">{total}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
            {totalLabel || 'Total'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full text-xs">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 truncate">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="font-semibold text-slate-900 ml-1">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
