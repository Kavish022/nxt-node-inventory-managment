'use client';

import React, { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/providers/auth-provider';
import { Bell, Wifi, WifiOff } from 'lucide-react';

export function Header() {
  const { user } = useAuth();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [notificationCount, setNotificationCount] = useState(2);

  useEffect(() => {
    try {
      const socket = getSocket();
      if (socket) {
        setIsSocketConnected(socket.connected);

        socket.on('connect', () => setIsSocketConnected(true));
        socket.on('disconnect', () => setIsSocketConnected(false));
        socket.on('stock:updated', () => {
          setNotificationCount((prev) => prev + 1);
        });

        return () => {
          socket.off('connect');
          socket.off('disconnect');
          socket.off('stock:updated');
        };
      }
    } catch (e) {
      console.warn('Socket connection not available yet:', e);
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-8 backdrop-blur">
      <div className="flex items-center gap-4">
        <h2 className="text-base font-semibold text-slate-800">
          FlowStock Administrative Portal
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Real-time WebSocket Status Pill */}
        <div
          title={isSocketConnected ? 'Real-Time WebSocket Sync Active' : 'WebSocket Disconnected'}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
        >
          {isSocketConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Live WS Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-700">Connecting WS...</span>
            </>
          )}
        </div>

        {/* Notifications */}
        <button
          onClick={() => setNotificationCount(0)}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Role badge */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-700/10">
            {user?.role || 'STAFF'}
          </span>
        </div>
      </div>
    </header>
  );
}
