'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  Warehouse,
  Truck,
  Users,
  ShoppingCart,
  Receipt,
  FileBarChart,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Boxes },
  { name: 'Categories', href: '/categories', icon: Layers },
  { name: 'Stock & Movements', href: '/inventory', icon: ArrowLeftRight },
  { name: 'Warehouses', href: '/warehouses', icon: Warehouse },
  { name: 'Suppliers', href: '/suppliers', icon: Truck },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
  { name: 'Sales Orders', href: '/sales-orders', icon: Receipt },
  { name: 'Reports & Exports', href: '/reports', icon: FileBarChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-colors">
      {/* Brand logo header */}
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white shadow-md shadow-sky-600/20">
          <Boxes className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">FlowStock</h1>
          <p className="text-[10px] uppercase font-semibold tracking-wider text-sky-600 dark:text-sky-400">Enterprise Core</p>
        </div>
      </div>

      {/* Nav items list */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems
          .filter((item) => !item.permission || hasPermission(item.permission))
          .map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <a
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold dark:bg-sky-950/60 dark:text-sky-300'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500')} />
                <span>{item.name}</span>
              </a>
            );
          })}
      </nav>

      {/* User info & Logout footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
              {user?.name?.slice(0, 2).toUpperCase() || 'US'}
            </div>
            <div className="truncate text-left">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{user?.name || 'User'}</p>
              <p className="truncate text-[10px] text-slate-500 dark:text-slate-400 font-medium">{user?.role || 'STAFF'}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            title="Log Out"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
