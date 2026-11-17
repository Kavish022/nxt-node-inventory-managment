'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Product, Warehouse, StockMovement, PaginatedResponse, ApiResponse } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeftRight,
  PlusCircle,
  MinusCircle,
  Sliders,
  History,
  AlertCircle,
  Building,
  Check,
} from 'lucide-react';

export default function InventoryPage() {
  const queryClient = useQueryClient();

  // Dialog states
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Adjust Form state
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustWarehouseId, setAdjustWarehouseId] = useState('');
  const [adjustType, setAdjustType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'RECONCILIATION'>('STOCK_IN');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // Transfer Form state
  const [transferProductId, setTransferProductId] = useState('');
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // 1. Fetch Warehouses
  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ['warehouses-list'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Warehouse>>('/warehouses?limit=50');
      return res.data.data.items;
    },
  });

  // 2. Fetch Products
  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-list-all'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Product>>('/products?limit=100');
      return res.data.data.items;
    },
  });

  // 3. Fetch Stock Movements History
  const { data: movementsData, isLoading: isMovementsLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<StockMovement>>('/inventory/movements?limit=50');
      return res.data.data;
    },
  });

  // 4. Adjust Mutation
  const adjustMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/inventory/adjust', {
        productId: Number(adjustProductId),
        warehouseId: Number(adjustWarehouseId),
        type: adjustType,
        quantity: parseFloat(adjustQuantity),
        notes: adjustNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsAdjustModalOpen(false);
      setActionSuccess('Stock adjustment processed successfully and audit log updated.');
      setTimeout(() => setActionSuccess(null), 5000);
      resetAdjustForm();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to adjust stock');
    },
  });

  // 5. Transfer Mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/inventory/transfer', {
        productId: Number(transferProductId),
        fromWarehouseId: Number(fromWarehouseId),
        toWarehouseId: Number(toWarehouseId),
        quantity: parseFloat(transferQuantity),
        notes: transferNotes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsTransferModalOpen(false);
      setActionSuccess('Stock transfer between warehouses completed successfully.');
      setTimeout(() => setActionSuccess(null), 5000);
      resetTransferForm();
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to execute warehouse transfer');
    },
  });

  const resetAdjustForm = () => {
    setAdjustProductId('');
    setAdjustWarehouseId('');
    setAdjustType('STOCK_IN');
    setAdjustQuantity('');
    setAdjustNotes('');
    setErrorMessage(null);
  };

  const resetTransferForm = () => {
    setTransferProductId('');
    setFromWarehouseId('');
    setToWarehouseId('');
    setTransferQuantity('');
    setTransferNotes('');
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Operations & Audit Log</h1>
          <p className="text-sm text-slate-500">
            Execute manual stock adjustments, warehouse transfers, and view immutable audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetAdjustForm();
              setIsAdjustModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition"
          >
            <Sliders className="h-4 w-4" />
            <span>Stock In / Out / Adjust</span>
          </button>

          <button
            onClick={() => {
              resetTransferForm();
              setIsTransferModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>Transfer Warehouses</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Movements Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Stock Movements History</h3>
          </div>
          <span className="text-xs text-slate-500">Real-Time Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5">Type</th>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Warehouse</th>
                <th className="px-6 py-3.5 text-right">Delta Qty</th>
                <th className="px-6 py-3.5 text-right">New Balance</th>
                <th className="px-6 py-3.5">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isMovementsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading audit movements...
                  </td>
                </tr>
              ) : !movementsData?.items || movementsData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No movements recorded yet.
                  </td>
                </tr>
              ) : (
                movementsData.items.map((m) => {
                  const qty = Number(m.quantity);
                  const isPositive = qty > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {m.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900">{m.product?.name}</span>
                        <span className="block text-xs font-mono text-slate-500">{m.product?.sku}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        {m.warehouse?.name} ({m.warehouse?.code})
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                        {m.resultingQuantity}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                        {m.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal Dialog */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Adjust Inventory Level</h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                adjustMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
                <select
                  required
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                >
                  <option value="">Choose Product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Warehouse *</label>
                <select
                  required
                  value={adjustWarehouseId}
                  onChange={(e) => setAdjustWarehouseId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                >
                  <option value="">Choose Warehouse</option>
                  {warehouses?.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Operation Type *</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="STOCK_IN">Stock In (+)</option>
                    <option value="STOCK_OUT">Stock Out (-)</option>
                    <option value="ADJUSTMENT">Stock Adjustment</option>
                    <option value="RECONCILIATION">Reconciliation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    placeholder="e.g. 25"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="e.g. Discrepancy found during quarterly physical audit"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
                >
                  {adjustMutation.isPending ? 'Processing...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal Dialog */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Transfer Between Warehouses</h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                transferMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
                <select
                  required
                  value={transferProductId}
                  onChange={(e) => setTransferProductId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                >
                  <option value="">Choose Product</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source Warehouse *</label>
                  <select
                    required
                    value={fromWarehouseId}
                    onChange={(e) => setFromWarehouseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="">From WH</option>
                    {warehouses?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination WH *</label>
                  <select
                    required
                    value={toWarehouseId}
                    onChange={(e) => setToWarehouseId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                  >
                    <option value="">To WH</option>
                    {warehouses?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Transfer *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  placeholder="e.g. 15"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Notes</label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Inter-warehouse rebalancing for West coast demand"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferMutation.isPending}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
                >
                  {transferMutation.isPending ? 'Transferring...' : 'Execute Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
