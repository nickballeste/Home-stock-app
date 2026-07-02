import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  useDeleteProduct,
  useMembers,
  useOverrideDuration,
  useProduct,
  useReInferDuration,
  useRestockProduct,
  useUpdateAlertConfig,
  useUpdateProduct,
} from '../api/queries';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { Input, Select } from '../components/Input';
import type { ConsumerScope } from '@homestock/types';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const { data: members = [] } = useMembers();
  const restock = useRestockProduct();
  const reInfer = useReInferDuration(id ?? '');
  const overrideDuration = useOverrideDuration(id ?? '');
  const updateProduct = useUpdateProduct(id ?? '');
  const updateAlertConfig = useUpdateAlertConfig(id ?? '');
  const deleteProduct = useDeleteProduct();
  const [days, setDays] = useState<number | ''>('');

  if (isLoading || !product) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }

  function handleOverride(e: React.FormEvent) {
    e.preventDefault();
    if (typeof days !== 'number' || days <= 0) return;
    overrideDuration.mutate({ estimatedDurationDays: days });
    setDays('');
  }

  function toggleScope(scope: ConsumerScope) {
    updateProduct.mutate({ consumerScope: scope });
  }

  function toggleMember(memberId: string) {
    const next = product!.consumerMemberIds.includes(memberId)
      ? product!.consumerMemberIds.filter((x) => x !== memberId)
      : [...product!.consumerMemberIds, memberId];
    updateProduct.mutate({ consumerMemberIds: next, consumerScope: 'specific' });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link to="/products" className="text-xs text-slate-500 hover:underline">
            ← All products
          </Link>
          <h1 className="text-2xl font-bold tracking-tight mt-1 truncate">{product.name}</h1>
          {product.brand && <p className="text-slate-500">{product.brand}</p>}
        </div>
        <StatusBadge status={product.alertStatus} />
      </header>

      {/* Duration block — most important info */}
      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Estimated end date
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {product.daysRemaining < 0
            ? `Overdue by ${-product.daysRemaining}d`
            : `${product.daysRemaining} day${product.daysRemaining === 1 ? '' : 's'} left`}
        </p>
        <p className="text-sm text-slate-500">
          {new Date(product.estimatedEndDate).toLocaleDateString()}
        </p>

        {product.inferenceConfidenceNote && !product.durationOverridden && (
          <p className="mt-3 text-xs italic text-slate-600">
            AI estimate: {product.inferenceConfidenceNote}
          </p>
        )}
        {product.durationOverridden && (
          <p className="mt-3 text-xs text-amber-700">
            Duration manually overridden — AI re-inference is paused.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => restock.mutate(product.id)}
            disabled={restock.isPending}
          >
            +1 restock
          </Button>
          <Button
            variant="secondary"
            onClick={() => reInfer.mutate()}
            disabled={reInfer.isPending}
          >
            Re-infer duration
          </Button>
        </div>

        <form onSubmit={handleOverride} className="mt-4 flex items-end gap-2">
          <Input
            label="Override days"
            type="number"
            min={1}
            value={days === '' ? '' : days}
            onChange={(e) => setDays(e.target.value === '' ? '' : Number(e.target.value))}
            className="max-w-[8rem]"
          />
          <Button type="submit" disabled={overrideDuration.isPending}>
            Override
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-2">
        <h2 className="text-sm font-semibold text-slate-700">Stock</h2>
        <p className="text-sm text-slate-600">
          {product.currentQuantity} package(s) · {product.packageSize} {product.unit} each
        </p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Who consumes it</h2>
        <div className="flex gap-2">
          <Button
            variant={product.consumerScope === 'all' ? 'primary' : 'secondary'}
            onClick={() => toggleScope('all')}
          >
            Everyone
          </Button>
          <Button
            variant={product.consumerScope === 'specific' ? 'primary' : 'secondary'}
            onClick={() => toggleScope('specific')}
          >
            Specific members
          </Button>
        </div>
        {product.consumerScope === 'specific' && (
          <div className="flex flex-wrap gap-2 pt-2">
            {members.map((m) => {
              const active = product.consumerMemberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={`text-sm px-3 py-1.5 rounded-full border ${
                    active
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
            {members.length === 0 && (
              <p className="text-xs text-slate-500">No members yet.</p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Alerts</h2>
        <Select
          label="Threshold (days)"
          value={product.alertConfig.overrideThresholdDays ?? ''}
          onChange={(e) => {
            const value = e.target.value === '' ? null : Number(e.target.value);
            updateAlertConfig.mutate({ overrideThresholdDays: value });
          }}
          disabled={updateAlertConfig.isPending}
          hint="Leave default to use the system-wide threshold."
        >
          <option value="">Use default</option>
          {[1, 2, 3, 5, 7, 10, 14].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={product.alertConfig.emailEnabled}
            disabled={updateAlertConfig.isPending}
            onChange={(e) => updateAlertConfig.mutate({ emailEnabled: e.target.checked })}
          />
          Include in daily email digest
        </label>
      </section>

      <section className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <h2 className="text-sm font-semibold text-rose-800">Danger zone</h2>
        <p className="text-xs text-rose-700 mb-3">Permanently delete this product.</p>
        <Button
          variant="danger"
          onClick={async () => {
            if (!confirm('Delete this product? This cannot be undone.')) return;
            await deleteProduct.mutateAsync(product.id);
            nav('/products');
          }}
          disabled={deleteProduct.isPending}
        >
          Delete product
        </Button>
      </section>
    </div>
  );
}
