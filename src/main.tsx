import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import './styles.css';

import { api } from './api';
import { User } from './types';
import { Shell } from './components/Shell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TasksPage } from './pages/TasksPage';
import { VisitsPage } from './pages/VisitsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { IssuesPage } from './pages/IssuesPage';
import { InventoryPage } from './pages/InventoryPage';
import { InstallationsPage } from './pages/InstallationsPage';
import { DailyReportsPage } from './pages/DailyReportsPage';
import { TeamLeadPage } from './pages/TeamLeadPage';
import { AuditPage } from './pages/AuditPage';
import { BackupPage } from './pages/BackupPage';
import { SettingsPage } from './pages/SettingsPage';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  const checkAuth = async () => {
    try {
      setAuthLoading(true);
      const res = await api<{ user: User | null; needsSetup: boolean }>('/auth/status');
      setUser(res.user);
      setNeedsSetup(res.needsSetup);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
    }
  };

  const handleQuickAction = (action: 'task' | 'visit' | 'expense' | 'issue' | 'report') => {
    if (action === 'task') navigate('/tasks');
    else if (action === 'visit') navigate('/visits');
    else if (action === 'expense') navigate('/expenses');
    else if (action === 'issue') navigate('/issues');
    else if (action === 'report') navigate('/reports');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Checking local authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        needsSetup={needsSetup}
        onLoginSuccess={(u) => {
          setUser(u);
          setNeedsSetup(false);
        }}
      />
    );
  }

  return (
    <Shell user={user} onLogout={handleLogout} onQuickAction={handleQuickAction}>
      <Routes>
        <Route
          path="/"
          element={<DashboardPage user={user} onOpenQuickAdd={handleQuickAction} />}
        />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/visits" element={<VisitsPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/issues" element={<IssuesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/installations" element={<InstallationsPage />} />
        <Route path="/reports" element={<DailyReportsPage />} />
        <Route path="/team-lead" element={<TeamLeadPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/backup" element={<BackupPage />} />
        <Route path="/settings" element={<SettingsPage user={user} />} />
      </Routes>
    </Shell>
  );
}

function Root() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<Root />);
}
