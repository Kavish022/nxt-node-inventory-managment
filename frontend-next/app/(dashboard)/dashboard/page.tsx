'use client';

import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/socket';
import { DashboardOverview, DashboardAnalytics, ApiResponse } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Boxes,
  Layers,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  Truck,
  Users,
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const PIE_COLORS = ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'];

export default function DashboardPage() {
  const queryClient = useQueryClient();

  // 1. Fetch Overview KPIs
  const { data: overview, isLoading: isOverviewLoading } = useQuery<DashboardOverview>({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<DashboardOverview>>('/dashboard/overview');
      return res.data.data;
    },
  });

  // 2. Fetch Analytics Charts
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery<DashboardAnalytics>({
    queryKey: ['dashboard-analytics'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<DashboardAnalytics>>('/dashboard/analytics');
      return res.data.data;
    },
  });

  // 3. Fetch Recent Activities
  const { data: recentActivities } = useQuery({
    queryKey: ['dashboard-recent-activities'],
    queryFn: async () => {
      const res = await apiClient.get('/dashboard/recent-activities');
      return res.data.data;
    },
  });

  // 4. WebSocket Event Listener for Real-Time Dashboard Invalidation
  useEffect(() => {
    try {
      const socket = getSocket();
      if (socket) {
        const handleStockUpdate = () => {
          queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-recent-activities'] });
        };

        socket.on('stock:updated', handleStockUpdate);
        return () => {
          socket.off('stock:updated', handleStockUpdate);
        };
      }
    } catch (e) {
      console.warn(e);
    }
  }, [queryClient]);

  if (isOverviewLoading || isAnalyticsLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Aggregating inventory metrics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Inventory Value',
      value: formatCurrency(overview?.totalInventoryValue || 0),
      subtitle: `${overview?.totalStockQuantity || 0} units stored`,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      title: 'Products in Catalog',
      value: overview?.totalProducts || 0,
      subtitle: `Across ${overview?.totalCategories || 0} categories`,
      icon: Boxes,
      color: 'bg-sky-50 text-sky-600 border-sky-200',
    },
    {
      title: 'Low Stock Alerts',
      value: overview?.lowStockCount || 0,
      subtitle: `${overview?.outOfStockCount || 0} out of stock`,
      icon: AlertTriangle,
      color: overview?.lowStockCount ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200',
    },
    {
      title: 'Active Purchase Orders',
      value: overview?.totalPurchaseOrders || 0,
      subtitle: `From ${overview?.totalSuppliers || 0} suppliers`,
      icon: ShoppingCart,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    },
    {
      title: 'Active Sales Orders',
      value: overview?.totalSalesOrders || 0,
      subtitle: `To ${overview?.totalCustomers || 0} customers`,
      icon: Receipt,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-slate-500">Live inventory valuation, demand trends, and stock movements.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync Active
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {card.title}
                </span>
                <div className={`rounded-lg p-2 border ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-extrabold text-slate-900">{card.value}</h3>
                <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Purchases vs Sales (2 Cols) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Procurement vs Sales Trends</h3>
              <p className="text-xs text-slate-500">Monthly aggregate order values (past 6 months)</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Bar dataKey="purchases" name="Purchases ($)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sales" name="Sales ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (1 Col) */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-1">Category Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Stock units per category</p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.categoryDistribution || []}
                  dataKey="totalQuantity"
                  nameKey="categoryName"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.categoryName} (${entry.totalQuantity})`}
                  labelLine={false}
                  fontSize={11}
                >
                  {(analytics?.categoryDistribution || []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts & Recent Activities Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Items Needing Reorder</h3>
            </div>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {analytics?.lowStockAlerts?.length || 0} Alerts
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {(!analytics?.lowStockAlerts || analytics.lowStockAlerts.length === 0) ? (
              <p className="p-6 text-center text-xs text-slate-500">All products are healthy above reorder levels.</p>
            ) : (
              analytics.lowStockAlerts.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{item.name}</p>
                    <p className="text-[10px] text-slate-500">SKU: {item.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      {item.currentStock} left (Min: {item.minStockLevel})
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Reorder: +{item.reorderQuantity}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Stock Movements Feed */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Stock Movements</h3>
            </div>
            <span className="text-xs text-slate-500">Audit Trail</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {(!recentActivities?.stockMovements || recentActivities.stockMovements.length === 0) ? (
              <p className="p-6 text-center text-xs text-slate-500">No stock movements recorded yet.</p>
            ) : (
              recentActivities.stockMovements.map((m: any) => {
                const isIncoming = Number(m.quantity) > 0;
                return (
                  <div key={m.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isIncoming ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {isIncoming ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-900">{m.product?.name || 'Product'}</p>
                        <p className="text-[10px] text-slate-500">
                          {m.type} • {m.warehouse?.name} • {formatDate(m.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${isIncoming ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isIncoming ? `+${m.quantity}` : m.quantity}
                      </p>
                      <p className="text-[10px] text-slate-400">Bal: {m.resultingQuantity}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
