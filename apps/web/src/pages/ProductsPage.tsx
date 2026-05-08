import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AlertStatus } from '@homestock/types';
import { useCategories, useMarkFinished, useProducts, useReInferAll } from '../api/queries';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AlertStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const reInferAll = useReInferAll();
  const markFinished = useMarkFinished();

  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading } = useProducts({
    search: search || undefined,
    status: (status || undefined) as AlertStatus | undefined,
    categoryId: categoryId || undefined,
    sort: 'endDate',
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => reInferAll.mutate()}
            disabled={reInferAll.isPending}
            title="Re-infer durations for all products (skips manually overridden)"
          >
            {reInferAll.isPending ? 'Re-inferring…' : 'Re-infer all durations'}
          </Button>
          <Link to="/products/new">
            <Button>Add product</Button>
          </Link>
        </div>
      </header>
      {reInferAll.isSuccess && (
        <p className="text-xs text-emerald-700">
          Done — {reInferAll.data.updated} updated, {reInferAll.data.skipped} skipped.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search by name or brand"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[12rem] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AlertStatus | '')}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ok">OK</option>
          <option value="alert">Running out</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-sm text-slate-500 text-center">Loading…</p>
        ) : products.length === 0 ? (
          <p className="p-8 text-sm text-slate-500 text-center">No products match.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Days left</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/products/${p.id}`} className="font-medium text-ink hover:underline">
                      {p.name}
                    </Link>
                    {p.brand && <span className="block text-xs text-slate-500">{p.brand}</span>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{p.currentQuantity}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {p.daysRemaining < 0 ? `−${-p.daysRemaining}` : p.daysRemaining}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.alertStatus} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.alertStatus !== 'overdue' && (
                      <button
                        type="button"
                        title="Mark as finished — product is currently out of stock"
                        disabled={markFinished.isPending}
                        onClick={() => markFinished.mutate(p.id)}
                        className="text-xs text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-40"
                      >
                        Out of stock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
