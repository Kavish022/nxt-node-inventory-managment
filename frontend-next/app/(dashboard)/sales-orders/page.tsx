'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { SalesOrder, PaginatedResponse } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Receipt, CheckCircle, Send, AlertCircle } from 'lucide-react';

export default function SalesOrdersPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: soData, isLoading } = useQuery({
    queryKey: ['sales-orders'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<SalesOrder>>('/sales-orders?limit=50');
      return res.data.data;
    },
  });

  const fulfillOrderMutation = useMutation({
    mutationFn: async (order: SalesOrder) => {
      const items = order.items?.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity) - Number(it.fulfilledQty),
      })).filter((it) => it.quantity > 0);

      return apiClient.post(`/sales-orders/${order.id}/fulfill`, {
        notes: `Order fulfillment dispatched at ${new Date().toLocaleDateString()}`,
        items,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSuccessMsg('Sales order fulfilled and inventory successfully deducted!');
      setTimeout(() => setSuccessMsg(null), 5000);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULFILLED':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'CONFIRMED':
        return 'bg-sky-50 text-sky-700 ring-sky-600/20';
      case 'RESERVED':
        return 'bg-purple-50 text-purple-700 ring-purple-600/20';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 ring-rose-600/20';
      default:
        return 'bg-slate-50 text-slate-700 ring-slate-600/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Orders</h1>
          <p className="text-sm text-slate-500">
            Customer sales dispatch, stock reservation, and inventory fulfillment lifecycle.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Sales Orders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">SO Number</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Fulfillment WH</th>
                <th className="px-6 py-3.5">Order Date</th>
                <th className="px-6 py-3.5 text-right">Total Value</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading sales orders...
                  </td>
                </tr>
              ) : !soData?.items || soData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No sales orders recorded yet.
                  </td>
                </tr>
              ) : (
                soData.items.map((so) => {
                  const canFulfill = so.status === 'CONFIRMED' || so.status === 'RESERVED' || so.status === 'PARTIALLY_FULFILLED';

                  return (
                    <tr key={so.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {so.orderNumber}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{so.customer?.name}</span>
                        <span className="block text-xs text-slate-400">{so.customer?.email}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {so.warehouse?.name} ({so.warehouse?.code})
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDate(so.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(so.total)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusBadge(
                            so.status
                          )}`}
                        >
                          {so.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canFulfill ? (
                          <button
                            onClick={() => fulfillOrderMutation.mutate(so)}
                            disabled={fulfillOrderMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 transition disabled:opacity-50"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Fulfill / Dispatch</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Dispatched</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
