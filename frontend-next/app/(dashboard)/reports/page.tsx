'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  FileBarChart,
  Download,
  DollarSign,
  Boxes,
  TrendingUp,
  AlertCircle,
  Building,
} from 'lucide-react';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'valuation' | 'lowstock'>('valuation');

  // 1. Fetch Valuation Report
  const { data: valuationData, isLoading: isValuationLoading } = useQuery({
    queryKey: ['report-valuation'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/valuation');
      return res.data.data;
    },
  });

  // 2. Fetch Low Stock Report
  const { data: lowStockData, isLoading: isLowStockLoading } = useQuery({
    queryKey: ['report-lowstock'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/low-stock');
      return res.data.data;
    },
  });

  // Direct CSV Download Handler
  const handleDownloadCsv = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
    window.open(`${apiUrl}/reports/valuation?format=csv`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Business Analytics</h1>
          <p className="text-sm text-slate-500">
            Export audit-ready inventory valuation reports, stock health assessments, and tax records.
          </p>
        </div>
        <button
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
        >
          <Download className="h-4 w-4" />
          <span>Export Valuation (CSV)</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('valuation')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'valuation'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Inventory Valuation Report
          </button>
          <button
            onClick={() => setActiveTab('lowstock')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              activeTab === 'lowstock'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Low-Stock Deficit Analysis
          </button>
        </div>
      </div>

      {activeTab === 'valuation' ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Valuation (Cost)</span>
              <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                {formatCurrency(valuationData?.summary?.totalValuationAtCost || 0)}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Total balance sheet asset value</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Total Valuation (Retail)</span>
              <h3 className="mt-2 text-2xl font-extrabold text-emerald-600">
                {formatCurrency(valuationData?.summary?.totalValuationAtRetail || 0)}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Potential gross realization</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Gross Margin Potential</span>
              <h3 className="mt-2 text-2xl font-extrabold text-indigo-600">
                {formatCurrency(
                  (valuationData?.summary?.totalValuationAtRetail || 0) -
                    (valuationData?.summary?.totalValuationAtCost || 0)
                )}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Projected inventory margin</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="text-xs font-semibold uppercase text-slate-500">Total On-Hand Units</span>
              <h3 className="mt-2 text-2xl font-extrabold text-slate-900">
                {valuationData?.summary?.totalQuantity || 0}
              </h3>
              <p className="mt-1 text-xs text-slate-400">Across all warehouses</p>
            </div>
          </div>

          {/* Detailed Valuation Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Warehouse</th>
                    <th className="px-6 py-3.5">SKU & Item</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5 text-right">Available Qty</th>
                    <th className="px-6 py-3.5 text-right">Cost Price</th>
                    <th className="px-6 py-3.5 text-right">Selling Price</th>
                    <th className="px-6 py-3.5 text-right">Valuation (Cost)</th>
                    <th className="px-6 py-3.5 text-right">Valuation (Retail)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isValuationLoading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        Calculating valuation aggregates...
                      </td>
                    </tr>
                  ) : !valuationData?.items || valuationData.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        No valuation records found.
                      </td>
                    </tr>
                  ) : (
                    valuationData.items.map((row: any) => (
                      <tr key={row.stockId} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-800">{row.warehouseCode}</span>
                          <span className="block text-xs text-slate-400">{row.warehouseName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900">{row.productName}</span>
                          <span className="block font-mono text-xs text-slate-500">{row.sku}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">{row.category}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono">
                          {row.availableQuantity}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600">
                          {formatCurrency(row.costPrice)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600">
                          {formatCurrency(row.sellingPrice)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(row.valuationAtCost)}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(row.valuationAtRetail)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Low Stock Analysis Tab */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Product Name</th>
                  <th className="px-6 py-3.5">SKU</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5 text-right">Current Stock</th>
                  <th className="px-6 py-3.5 text-right">Min Stock Level</th>
                  <th className="px-6 py-3.5 text-right">Stock Deficit</th>
                  <th className="px-6 py-3.5 text-right">Recommended Reorder</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLowStockLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      Analyzing stock deficits...
                    </td>
                  </tr>
                ) : !lowStockData?.items || lowStockData.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No products are below minimum thresholds. Inventory is healthy!
                    </td>
                  </tr>
                ) : (
                  lowStockData.items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">{item.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">{item.sku}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">{item.category}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-amber-700">
                        {item.currentStock}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-600">
                        {item.minStockLevel}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-rose-600">
                        -{item.deficit}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-sky-700">
                        +{item.reorderQuantity}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
