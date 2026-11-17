'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Boxes, ShieldCheck, Warehouse, User, AlertCircle, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) {
          throw new Error('Please enter your name');
        }
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Authentication failed. Please check your inputs or try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
    setLoading(true);
    try {
      await login(userEmail, userPass);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
        (err as Error)?.message ||
        'Authentication failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-900">
      {/* Left Marketing / System Info Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white border-r border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500 shadow-lg shadow-sky-500/30">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">FlowStock Enterprise</span>
          </div>
          <p className="mt-2 text-sm text-slate-400">Production-Ready Multi-Warehouse Inventory Architecture</p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-6 backdrop-blur">
            <h3 className="font-semibold text-lg text-white">Real-Time Logistics & Stock Reconciliation</h3>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
              Equipped with transaction-safe stock decrements, decimal-precision monetary accounting, automated
              purchase/sales order fulfillment, and live WebSocket telemetry.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live WebSocket Stream
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Prisma MySQL Engine
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                Role-Based Access Control
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                HttpOnly Secure Session
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">© 2026 FlowStock. All rights reserved.</p>
      </div>

      {/* Right Form Card */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <Boxes className="h-6 w-6 text-sky-600" />
              <span className="text-xl font-bold text-slate-900 dark:text-white">FlowStock</span>
            </div>
            
            {/* Tab Switcher */}
            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 mb-6">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition ${
                  !isRegister
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition ${
                  isRegister
                    ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserPlus className="h-4 w-4" />
                <span>Create Account</span>
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isRegister ? 'Create an account' : 'Sign in to your account'}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isRegister
                ? 'Sign up with any email (Gmail, Yopmail, etc.)'
                : 'Enter your credentials or use 1-click demo login'}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-50"
            >
              <span>{loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick 1-Click Demo Section (Only on Sign In tab) */}
          {!isRegister && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  1-Click Instant Login
                </p>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full">
                  Click to enter
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickLoginAs('admin@inventory.com', 'Admin@123456')}
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-center text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-slate-800 hover:border-sky-300 transition"
                >
                  <ShieldCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                  <span className="font-semibold">Super Admin</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickLoginAs('manager@inventory.com', 'Manager@123456')}
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-center text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:border-indigo-300 transition"
                >
                  <Warehouse className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-semibold">Lead Mgr</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => quickLoginAs('staff@inventory.com', 'Staff@123456')}
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-2.5 text-center text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-slate-800 hover:border-emerald-300 transition"
                >
                  <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-semibold">Staff Assoc</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
