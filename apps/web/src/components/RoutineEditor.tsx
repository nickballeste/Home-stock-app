import type { DayOfWeek } from '@homestock/types';
import Button from './Button';

export interface EditableSlot {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

interface Props {
  slots: EditableSlot[];
  onChange: (next: EditableSlot[]) => void;
}

export default function RoutineEditor({ slots, onChange }: Props) {
  function update(id: string, patch: Partial<EditableSlot>) {
    onChange(slots.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function remove(id: string) {
    onChange(slots.filter((s) => s.id !== id));
  }
  function add() {
    onChange([
      ...slots,
      {
        id: crypto.randomUUID(),
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '18:00',
      },
    ]);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-800">Routine slots</span>
        <Button type="button" variant="ghost" onClick={add}>
          + Add slot
        </Button>
      </div>
      {slots.length === 0 && (
        <p className="text-xs text-slate-500">
          No slots. Add manually or paste a description above and click Extract.
        </p>
      )}
      <ul className="space-y-2">
        {slots.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-white p-3"
          >
            <select
              value={s.dayOfWeek}
              onChange={(e) =>
                update(s.id, { dayOfWeek: Number(e.target.value) as DayOfWeek })
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={s.startTime}
              onChange={(e) => update(s.id, { startTime: e.target.value })}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
            <span className="text-slate-500">→</span>
            <input
              type="time"
              value={s.endTime}
              onChange={(e) => update(s.id, { endTime: e.target.value })}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => remove(s.id)}
              className="ml-auto text-xs text-rose-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
