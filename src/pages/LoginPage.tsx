import React, { useState } from 'react';
import { Lock, UserCheck, ShieldCheck, HardDrive, KeyRound } from 'lucide-react';
import { api } from '../api';
import { User } from '../types';

interface LoginPageProps {
  needsSetup: boolean;
  onLoginSuccess: (user: User) => void;
}

export function LoginPage({ needsSetup, onLoginSuccess }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const endpoint = needsSetup ? '/auth/setup' : '/auth/login';
      const res = await api<{ user: User }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50/40 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow-lg mb-3">
            FO
          </div>
          <h1 className="text-xl font-bold tracking-tight">FieldOps Local</h1>
          <p className="text-xs text-slate-300 mt-1">
            Offline Field Operations & Work Management
          </p>


        </div>

        {/* Form Container */}
        <div className="p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {needsSetup ? 'Initial Local Owner Setup' : 'Unlock Local Workspace'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {needsSetup
                ? 'Create the local master user account. Passwords are saved with bcrypt locally.'
                : 'Enter your local credentials to access records on this computer.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {needsSetup && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  name="name"
                  required
                  placeholder="e.g. Manoj S Arya"
                  defaultValue="Manoj S Arya"
                  className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Local Username</label>
              <input
                name="username"
                required
                placeholder="e.g. Manoj S Arya"
                defaultValue={needsSetup ? 'Manoj S Arya' : ''}
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="w-full p-2.5 border border-slate-200 rounded-lg focus:outline-sky-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                'Processing...'
              ) : needsSetup ? (
                <>
                  <UserCheck size={16} /> Create Local Owner Account
                </>
              ) : (
                <>
                  <KeyRound size={16} /> Unlock Workspace
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 text-center space-y-1">
            <p>Bound strictly to 127.0.0.1 · Stored on local filesystem</p>
            <p>Electronics & Laboratory Equipment Field Ops</p>
          </div>
        </div>
      </div>
    </div>
  );
}
