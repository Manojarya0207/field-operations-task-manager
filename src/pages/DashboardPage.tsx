import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  MapPin,
  ReceiptIndianRupee,
  ShieldAlert,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { api, formatINR, formatDateTime } from '../api';
import { DashboardMetrics, User } from '../types';
import { Badge } from '../components/Badge';
import { DonutBreakdown, SimpleBarChart } from '../components/MiniCharts';
import { SafetyBanner } from '../components/SafetyBanner';

interface DashboardPageProps {
  user: User;
  onOpenQuickAdd: (action: 'task' | 'visit' | 'expense' | 'issue' | 'report') => void;
}

export function DashboardPage({ user, onOpenQuickAdd }: DashboardPageProps) {
  const [data, setData] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api<DashboardMetrics>('/dashboard');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading local records from SQLite...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-3">
        <div className="flex items-center gap-2 font-bold text-base">
          <AlertCircle size={20} /> Error loading local dashboard
        </div>
        <p className="text-sm">{error || 'Could not fetch records from local SQLite database.'}</p>
        <button
          onClick={loadDashboard}
          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Greetings based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Task priority breakdown
  const priorityChartData = [
    {
      label: 'Urgent',
      count: data.tasksByPriority.find((p) => p.priority === 'Urgent')?.count || 0,
      color: '#e11d48',
    },
    {
      label: 'High',
      count: data.tasksByPriority.find((p) => p.priority === 'High')?.count || 0,
      color: '#f97316',
    },
    {
      label: 'Medium',
      count: data.tasksByPriority.find((p) => p.priority === 'Medium')?.count || 0,
      color: '#0284c7',
    },
    {
      label: 'Low',
      count: data.tasksByPriority.find((p) => p.priority === 'Low')?.count || 0,
      color: '#64748b',
    },
  ];

  // Expense categories bar chart
  const expenseBarData = data.expensesByCategory.slice(0, 5).map((e) => ({
    label: e.category,
    value: e.total_paise,
    color: 'bg-purple-600',
  }));

  return (
    <div className="space-y-6">
      {/* GREETING & QUICK ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Offline field operations workspace · All data stored locally in SQLite on this computer.
          </p>
        </div>

        {/* Date Filter Tabs & Quick Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeFilter === 'today' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeFilter === 'week' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                timeFilter === 'month' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'hover:text-slate-900'
              }`}
            >
              This Month
            </button>
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => onOpenQuickAdd('task')}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Task
            </button>
            <button
              onClick={() => onOpenQuickAdd('visit')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Visit
            </button>
            <button
              onClick={() => onOpenQuickAdd('expense')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1"
            >
              <Plus size={14} /> Expense
            </button>
          </div>
        </div>
      </div>

      {/* SAFETY NOTICE IF CRITICAL ISSUES EXIST */}
      {data.criticalIssues > 0 && (
        <SafetyBanner
          severity="Critical"
          category="Electrical"
        />
      )}

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Assigned Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Assigned Today</span>
            <CheckSquare size={16} className="text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.assignedToday}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <span>{data.completedToday} completed today</span>
          </div>
        </div>

        {/* Card 2: Pending & Overdue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pending Tasks</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.pendingTasks}</div>
          <div className={`text-[11px] font-medium mt-1 ${data.overdueTasks > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
            {data.overdueTasks} overdue · {data.blockedTasks} blocked
          </div>
        </div>

        {/* Card 3: Field Visits */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Visits Today</span>
            <MapPin size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.visitsPlanned}</div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {data.visitsCompleted} completed
          </div>
        </div>

        {/* Card 4: Today's Expenses */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Today's Expenses</span>
            <ReceiptIndianRupee size={16} className="text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-700 truncate">
            {formatINR(data.todayExpensesPaise)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            Month: {formatINR(data.monthlyExpensesPaise)}
          </div>
        </div>

        {/* Card 5: Unresolved Issues */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Open Issues</span>
            <ShieldAlert size={16} className={data.unresolvedIssues > 0 ? 'text-rose-600' : 'text-slate-400'} />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.unresolvedIssues}</div>
          <div className="text-[11px] text-rose-600 font-medium mt-1">
            {data.criticalIssues} critical · {data.issuesAwaitingHelp} need help
          </div>
        </div>

        {/* Card 6: Claims Awaiting Settlement */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Pending Claims</span>
            <TrendingUp size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {data.claimsAwaitingApproval + data.claimsAwaitingSettlement}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1 truncate">
            {formatINR(data.pendingReimbursementPaise)} pending
          </div>
        </div>
      </div>

      {/* TWO COLUMN OPERATIONAL PANELS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2 COLUMNS: Operational Work Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Tasks by Priority & Status */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare size={16} className="text-sky-600" />
                Task Workload & Urgency Distribution
              </h2>
              <NavLink
                to="/tasks"
                className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
              >
                View all tasks <ArrowRight size={13} />
              </NavLink>
            </div>

            <div className="pt-3">
              <DonutBreakdown
                items={priorityChartData}
                totalLabel="Active Tasks"
              />
            </div>
          </div>

          {/* Expenses by Category & Advance Tracker */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ReceiptIndianRupee size={16} className="text-purple-600" />
                Monthly Expenses Breakdown & Company Advances
              </h2>
              <NavLink
                to="/expenses"
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                Expense ledger <ArrowRight size={13} />
              </NavLink>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
              <div>
                <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                  Top Expense Categories (Month)
                </h4>
                <SimpleBarChart data={expenseBarData} isCurrency />
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-600 mb-1">
                    Company Advances Remaining Balance
                  </h4>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {formatINR(data.advancesBalancePaise)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Advances are tracked independently. Expenses funded via company advances do not enter personal reimbursement claims.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200/60 mt-3 flex justify-between text-xs">
                  <span className="text-slate-600">Pending personal claims:</span>
                  <span className="font-bold text-slate-800">
                    {formatINR(data.pendingReimbursementPaise)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Operational Alerts & Recent Audit Trail */}
        <div className="space-y-6">
          {/* Quick Shortcuts Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-slate-600" /> Quick Operations
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <NavLink
                to="/tasks"
                className="p-3 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 border border-slate-200 rounded-lg font-semibold text-slate-800 transition-colors flex flex-col items-center text-center gap-1"
              >
                <CheckSquare size={18} className="text-sky-600" />
                <span>My Tasks</span>
              </NavLink>
              <NavLink
                to="/visits"
                className="p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg font-semibold text-slate-800 transition-colors flex flex-col items-center text-center gap-1"
              >
                <MapPin size={18} className="text-emerald-600" />
                <span>Field Visits</span>
              </NavLink>
              <NavLink
                to="/issues"
                className="p-3 bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 rounded-lg font-semibold text-slate-800 transition-colors flex flex-col items-center text-center gap-1"
              >
                <ShieldAlert size={18} className="text-rose-600" />
                <span>Issues & Safety</span>
              </NavLink>
              <NavLink
                to="/reports"
                className="p-3 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200 rounded-lg font-semibold text-slate-800 transition-colors flex flex-col items-center text-center gap-1"
              >
                <FileText size={18} className="text-purple-600" />
                <span>Daily Reports</span>
              </NavLink>
            </div>
          </div>

          {/* Recent Local Audit Activity */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Recent Audit Trail
              </h3>
              <NavLink
                to="/audit"
                className="text-xs font-semibold text-sky-600 hover:text-sky-800"
              >
                Full history
              </NavLink>
            </div>

            <div className="divide-y divide-slate-100 mt-2 max-h-[360px] overflow-y-auto">
              {data.recentAudit.length ? (
                data.recentAudit.map((log) => (
                  <div key={log.id} className="py-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 capitalize">
                        {log.action} · <span className="text-slate-500 font-normal">{log.entity_type}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(log.created_at)}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-slate-600 truncate">{log.reason}</p>
                    )}
                    <div className="text-[10px] text-slate-400">
                      User: {log.user_name || 'Local System'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No audit events recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
