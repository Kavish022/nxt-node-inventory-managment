'use client';

import React, { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Boxes, ShieldCheck, Warehouse, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to authenticate. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
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

      {/* Right Login Form */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-2xl border border-slate-100">
          <div>
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <Boxes className="h-6 w-6 text-sky-600" />
              <span className="text-xl font-bold text-slate-900">FlowStock</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your business email and password</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@inventory.com"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Demo Credentials Preset Bar */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
              Quick Role Presets
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin@inventory.com', 'Admin@123456')}
                className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <ShieldCheck className="h-4 w-4 text-sky-600" />
                <span>Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('manager@inventory.com', 'Manager@123456')}
                className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <Warehouse className="h-4 w-4 text-indigo-600" />
                <span>Inventory Lead</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('staff@inventory.com', 'Staff@123456')}
                className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 p-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <User className="h-4 w-4 text-emerald-600" />
                <span>Staff Assoc.</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
