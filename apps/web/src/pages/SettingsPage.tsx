import { useEffect, useState } from 'react';
import { useCategories, useCreateCategory, useDeleteCategory, useSettings, useUpdateCategory, useUpdateSettings } from '../api/queries';
import { Input } from '../components/Input';
import Button from '../components/Button';
import type { Category } from '@homestock/types';

function CategoryRow({ cat }: { cat: Category }) {
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cat.name);

  async function handleSave() {
    if (!name.trim() || name.trim() === cat.name) { setEditing(false); return; }
    await updateCategory.mutateAsync({ id: cat.id, name: name.trim() });
    setEditing(false);
  }

  return (
    <li className="flex items-center gap-2 py-2">
      {editing ? (
        <>
          <input
            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
          />
          <Button variant="secondary" onClick={handleSave} disabled={updateCategory.isPending}>
            {updateCategory.isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="ghost" onClick={() => { setEditing(false); setName(cat.name); }}>Cancel</Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm">{cat.name}</span>
          <Button variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
          <Button
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50"
            onClick={() => deleteCategory.mutate(cat.id)}
            disabled={deleteCategory.isPending}
          >
            Delete
          </Button>
        </>
      )}
    </li>
  );
}

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const update = useUpdateSettings();
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const [newCategoryName, setNewCategoryName] = useState('');

  const [thresholdDays, setThresholdDays] = useState(3);
  const [digestEmailTime, setDigestEmailTime] = useState('08:00');
  const [digestEmailAddress, setDigestEmailAddress] = useState('');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  useEffect(() => {
    if (settings) {
      setThresholdDays(settings.defaultAlertThresholdDays);
      setDigestEmailTime(settings.digestEmailTime);
      setDigestEmailAddress(settings.digestEmailAddress);
      setTimezone(settings.timezone);
    }
  }, [settings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await update.mutateAsync({
      defaultAlertThresholdDays: thresholdDays,
      digestEmailTime,
      digestEmailAddress,
      timezone,
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <Input
          label="Default alert threshold (days)"
          type="number"
          min={0}
          max={60}
          value={thresholdDays}
          onChange={(e) => setThresholdDays(Number(e.target.value))}
          hint="Per-product overrides take precedence over this default."
        />
        <Input
          label="Digest email time"
          type="time"
          value={digestEmailTime}
          onChange={(e) => setDigestEmailTime(e.target.value)}
        />
        <Input
          label="Digest email recipient"
          type="email"
          value={digestEmailAddress}
          onChange={(e) => setDigestEmailAddress(e.target.value)}
        />
        <Input
          label="Timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          hint="IANA timezone, e.g. America/Sao_Paulo"
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {update.isSuccess && <p className="text-xs text-emerald-700">Settings saved.</p>}
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-base font-semibold">Categories</h2>
        <ul className="divide-y divide-slate-100">
          {categories.map((cat) => <CategoryRow key={cat.id} cat={cat} />)}
        </ul>
        <form
          className="flex gap-2 pt-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const name = newCategoryName.trim();
            if (!name) return;
            await createCategory.mutateAsync({ name, icon: 'box' });
            setNewCategoryName('');
          }}
        >
          <input
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            placeholder="New category name…"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button type="submit" variant="secondary" disabled={createCategory.isPending || !newCategoryName.trim()}>
            Add
          </Button>
        </form>
      </section>
    </div>
  );
}
