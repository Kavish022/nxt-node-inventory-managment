'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await apiClient.get('/auth/me');
        setUser(res.data.data);
      } catch {
        setUser(null);
        if (pathname !== '/login' && !pathname.startsWith('/login')) {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [pathname, router]);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    setUser(res.data.data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
