import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  MapPin,
  ReceiptIndianRupee,
  ShieldAlert,
  Package,
  Wrench,
  FileText,
  UserCheck,
  History,
  HardDrive,
  Settings,
  LogOut,
  Plus,
  Radio,
  Menu,
  X,
} from 'lucide-react';
import { User } from '../types';

interface ShellProps {
  user: User;
  onLogout: () => void;
  onQuickAction?: (action: 'task' | 'visit' | 'expense' | 'issue' | 'report') => void;
  children: React.ReactNode;
}

export function Shell({ user, onLogout, onQuickAction, children }: ShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tasks', label: 'My Tasks', icon: CheckSquare },
    { to: '/visits', label: 'Field Visits', icon: MapPin },
    { to: '/expenses', label: 'Expenses', icon: ReceiptIndianRupee },
    { to: '/issues', label: 'Issues & Support', icon: ShieldAlert },
    { to: '/inventory', label: 'Inventory & QA', icon: Package },
    { to: '/installations', label: 'Installation Jobs', icon: Wrench },
    { to: '/reports', label: 'Daily Reports', icon: FileText },
    { to: '/team-lead', label: 'Team Lead Workspace', icon: UserCheck },
    { to: '/audit', label: 'Audit History', icon: History },
    { to: '/backup', label: 'Backup & Restore', icon: HardDrive },
    { to: '/settings', label: 'Settings & Master Data', icon: Settings },
  ];

  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 fixed inset-y-0 z-30">
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            FO
          </div>
          <div>
            <div className="font-bold text-slate-900 tracking-tight leading-none text-base">
              FieldOps
            </div>
            <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-0.5">
              Local Workplace
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sky-50 text-sky-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                <Icon size={18} className="shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 shadow-xs">
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wide truncate">
                Role: {user.role}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Lock workspace"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white font-bold text-sm">
                  FO
                </div>
                <span className="font-bold text-slate-900">FieldOps Local</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-sky-50 text-sky-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 bg-rose-50 hover:bg-rose-100"
              >
                <LogOut size={16} /> Lock Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0 pb-16 lg:pb-8">
        {/* TOP HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800">
                {currentDateStr}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-400">
                Electronics & Laboratory Equipment Field Operations
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* OFFLINE STATUS BADGE */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Offline & Local Only · 127.0.0.1</span>
              <span className="sm:hidden">Local Only</span>
            </div>

            {/* QUICK ACTIONS DROPDOWN */}
            {onQuickAction && (
              <div className="relative">
                <button
                  onClick={() => setQuickMenuOpen(!quickMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  <Plus size={15} />
                  <span className="hidden sm:inline">Quick Add</span>
                </button>

                {quickMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onQuickAction('task');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <CheckSquare size={14} className="text-sky-600" /> + Add Task
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onQuickAction('visit');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <MapPin size={14} className="text-emerald-600" /> + Add Visit
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onQuickAction('expense');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ReceiptIndianRupee size={14} className="text-purple-600" /> + Add Expense
                    </button>
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onQuickAction('issue');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <ShieldAlert size={14} className="text-rose-600" /> + Report Issue
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => {
                        setQuickMenuOpen(false);
                        onQuickAction('report');
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileText size={14} className="text-slate-600" /> Generate Daily Report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* CONTENT */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-30 flex justify-around py-2 shadow-lg mobile-bottom-nav">
        {[
          { to: '/', label: 'Overview', icon: LayoutDashboard },
          { to: '/tasks', label: 'Tasks', icon: CheckSquare },
          { to: '/visits', label: 'Visits', icon: MapPin },
          { to: '/expenses', label: 'Expenses', icon: ReceiptIndianRupee },
          { to: '/issues', label: 'Issues', icon: ShieldAlert },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 text-[10px] font-medium transition-colors py-1 px-3 ${
                  isActive ? 'text-sky-600 font-bold' : 'text-slate-500'
                }`
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
