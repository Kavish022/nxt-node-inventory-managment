'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Category, ApiResponse } from '@/types';
import { Layers, Plus, AlertCircle, Check } from 'lucide-react';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ['categories-page'],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Category[]>>('/categories');
      return res.data.data;
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      return apiClient.post('/categories', {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: description || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-page'] });
      setIsModalOpen(false);
      setName('');
      setSlug('');
      setDescription('');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create category');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Product Categories</h1>
          <p className="text-sm text-slate-500">Organize and classify inventory catalog hierarchy.</p>
        </div>
        <button
          onClick={() => {
            setName('');
            setSlug('');
            setDescription('');
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>New Category</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <p className="col-span-3 text-center py-12 text-slate-400">Loading categories...</p>
        ) : !categories || categories.length === 0 ? (
          <p className="col-span-3 text-center py-12 text-slate-400">No categories defined.</p>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="rounded-lg bg-sky-50 p-2.5 text-sky-600 border border-sky-200">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{c.name}</h3>
                  <p className="font-mono text-xs text-slate-400">/{c.slug}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">
                {c.description || 'No description provided.'}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Category</h3>
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
                createCategoryMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  placeholder="e.g. Storage & Networking"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL Slug</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="storage-networking"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of products in this category"
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
                  disabled={createCategoryMutation.isPending}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
                >
                  {createCategoryMutation.isPending ? 'Saving...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
