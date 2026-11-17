'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PurchaseOrder, PaginatedResponse } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ShoppingCart, CheckCircle, PackageCheck, AlertCircle } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data: poData, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<PurchaseOrder>>('/purchase-orders?limit=50');
      return res.data.data;
    },
  });

  const receiveOrderMutation = useMutation({
    mutationFn: async (order: PurchaseOrder) => {
      // Build receive items payload matching order items
      const items = order.items?.map((it) => ({
        productId: it.productId,
        quantity: Number(it.quantity) - Number(it.receivedQty),
      })).filter((it) => it.quantity > 0);

      return apiClient.post(`/purchase-orders/${order.id}/receive`, {
        notes: `Full goods receipt processed at ${new Date().toLocaleDateString()}`,
        items,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSuccessMsg('Goods successfully received! Inventory stock levels updated.');
      setTimeout(() => setSuccessMsg(null), 5000);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
      case 'APPROVED':
        return 'bg-sky-50 text-sky-700 ring-sky-600/20';
      case 'PENDING_APPROVAL':
        return 'bg-amber-50 text-amber-700 ring-amber-600/20';
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchase Orders</h1>
          <p className="text-sm text-slate-500">
            Supplier procurement lifecycle, approvals, and physical warehouse goods receipt.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Purchase Orders Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">PO Number</th>
                <th className="px-6 py-3.5">Supplier</th>
                <th className="px-6 py-3.5">Destination WH</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5 text-right">Total Amount</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : !poData?.items || poData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              ) : (
                poData.items.map((po) => {
                  const canReceive = po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {po.orderNumber}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{po.supplier?.name}</span>
                        <span className="block text-xs text-slate-400">{po.supplier?.email}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {po.warehouse?.name} ({po.warehouse?.code})
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formatDate(po.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(po.total)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusBadge(
                            po.status
                          )}`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {canReceive ? (
                          <button
                            onClick={() => receiveOrderMutation.mutate(po)}
                            disabled={receiveOrderMutation.isPending}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>Receive Goods</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Completed</span>
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
