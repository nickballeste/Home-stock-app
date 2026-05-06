import type { AlertStatus } from '@homestock/types';

const STYLES: Record<AlertStatus, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  alert: 'bg-amber-100 text-amber-800',
  overdue: 'bg-rose-100 text-rose-800',
};

const LABELS: Record<AlertStatus, string> = {
  ok: 'OK',
  alert: 'Running out',
  overdue: 'Overdue',
};

export default function StatusBadge({ status }: { status: AlertStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
