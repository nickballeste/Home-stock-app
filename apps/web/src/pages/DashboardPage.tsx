import { Link } from 'react-router-dom';
import type { ProductSummary } from '@homestock/types';
import { useActiveAlerts, useAlertSummary, useProducts, useRestockProduct } from '../api/queries';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';

export default function DashboardPage() {
  const { data: alerts = [], isLoading: alertsLoading } = useActiveAlerts();
  const { data: summary } = useAlertSummary();
  const { data: allProducts = [] } = useProducts({});
  const restock = useRestockProduct();

  const overdue = alerts.filter((p) => p.alertStatus === 'overdue');
  const ending = alerts.filter((p) => p.alertStatus === 'alert');
  const okCount = summary?.totalOk ?? 0;

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Home stock</h1>
          <p className="text-sm text-slate-600">
            {alertsLoading ? 'Loading…' : summarize(summary?.totalAlerts ?? 0, summary?.totalOverdue ?? 0)}
          </p>
        </div>
        <Link to="/products/new">
          <Button>Add product</Button>
        </Link>
      </header>

      {overdue.length > 0 && (
        <Section title={`Already out / overdue (${overdue.length})`} tone="danger">
          {overdue.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onRestock={() => restock.mutate(p.id)}
              busy={restock.isPending && restock.variables === p.id}
            />
          ))}
        </Section>
      )}

      {ending.length > 0 && (
        <Section title={`Ending soon (${ending.length})`}>
          {ending.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onRestock={() => restock.mutate(p.id)}
              busy={restock.isPending && restock.variables === p.id}
            />
          ))}
        </Section>
      )}

      {alerts.length === 0 && !alertsLoading && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-700 font-medium">Nothing's running out.</p>
          <p className="text-sm text-slate-500 mt-1">
            {allProducts.length} product{allProducts.length === 1 ? '' : 's'} tracked.
          </p>
        </div>
      )}

      {okCount > 0 && (
        <details className="rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
            Healthy stock — {okCount} product{okCount === 1 ? '' : 's'} OK
          </summary>
          <div className="border-t border-slate-200 px-4 py-2">
            <Link to="/products" className="text-sm text-accent hover:underline">
              View all products →
            </Link>
          </div>
        </details>
      )}
    </div>
  );
}

function summarize(alerts: number, overdue: number): string {
  if (alerts === 0 && overdue === 0) return 'All clear.';
  const parts: string[] = [];
  if (overdue > 0) parts.push(`${overdue} overdue`);
  if (alerts > 0) parts.push(`${alerts} running out`);
  return parts.join(' · ');
}

function Section(props: { title: string; tone?: 'danger'; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className={`text-sm font-semibold uppercase tracking-wide mb-3 ${
          props.tone === 'danger' ? 'text-rose-700' : 'text-amber-800'
        }`}
      >
        {props.title}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">{props.children}</div>
    </section>
  );
}

function ProductCard(props: {
  product: ProductSummary;
  onRestock: () => void;
  busy: boolean;
}) {
  const { product } = props;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/products/${product.id}`} className="block min-w-0 flex-1">
          <p className="font-semibold truncate">{product.name}</p>
          {product.brand && <p className="text-xs text-slate-500 truncate">{product.brand}</p>}
        </Link>
        <StatusBadge status={product.alertStatus} />
      </div>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-xs text-slate-500">
          {product.daysRemaining < 0
            ? `Overdue by ${-product.daysRemaining}d`
            : `${product.daysRemaining}d left`}
        </p>
        <Button variant="secondary" onClick={props.onRestock} disabled={props.busy}>
          {props.busy ? 'Restocking…' : '+1 restock'}
        </Button>
      </div>
    </div>
  );
}
