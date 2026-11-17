'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Customer, PaginatedResponse } from '@/types';
import { Users, Plus, Mail, Phone, MapPin, AlertCircle } from 'lucide-react';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('United States');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers-page'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Customer>>('/customers?limit=50');
      return res.data.data;
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/customers', {
        name,
        email: email || undefined,
        phone: phone || undefined,
        billingAddress: billingAddress || undefined,
        shippingAddress: shippingAddress || undefined,
        city: city || undefined,
        country: country || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-page'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create customer');
    },
  });

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setBillingAddress('');
    setShippingAddress('');
    setCity('');
    setCountry('United States');
    setErrorMsg(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Accounts</h1>
          <p className="text-sm text-slate-500">Corporate buyers, billing profiles, and shipping destinations.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="col-span-3 text-center py-12 text-slate-400">Loading customers...</p>
        ) : !customersData?.items || customersData.items.length === 0 ? (
          <p className="col-span-3 text-center py-12 text-slate-400">No customers registered.</p>
        ) : (
          customersData.items.map((c) => (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-purple-50 p-2 text-purple-600 border border-purple-200">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-slate-900">{c.name}</span>
                  </div>
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {c.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600">
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  )}
                  {c.billingAddress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.billingAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Account Status</span>
                <span className="font-semibold text-emerald-700">Active Commercial</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Customer</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createCustomerMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer / Entity Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Global Logistics"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="procurement@client.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1-555-0200"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="e.g. 100 Financial Way, Suite 300"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCustomerMutation.isPending}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
                >
                  {createCustomerMutation.isPending ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
