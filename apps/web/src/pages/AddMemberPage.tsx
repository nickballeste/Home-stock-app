import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateMember, useExtractRoutine, useReInferAll } from '../api/queries';
import { Textarea } from '../components/Input';
import Button from '../components/Button';
import RoutineEditor, { type EditableSlot } from '../components/RoutineEditor';
import AvatarPicker from '../components/AvatarPicker';
import Dialog from '../components/Dialog';

export default function AddMemberPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [slots, setSlots] = useState<EditableSlot[]>([]);
  const [newMemberId, setNewMemberId] = useState<string | null>(null);

  const createMember = useCreateMember();
  const extract = useExtractRoutine();
  const reInferAll = useReInferAll();

  const replaceRoutineForId = (id: string) =>
    fetch(`/api/v1/members/${id}/routine`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        slots: slots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      }),
    });

  async function handleExtract() {
    if (!prompt.trim()) return;
    const result = await extract.mutateAsync(prompt);
    setSlots(result.slots.map((s) => ({ ...s, id: crypto.randomUUID() })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const member = await createMember.mutateAsync({ name, avatarUrl });
    if (slots.length > 0) await replaceRoutineForId(member.id);
    setNewMemberId(member.id);
  }

  async function handleReInferYes() {
    await reInferAll.mutateAsync();
    nav(`/members/${newMemberId}`);
  }

  function handleReInferNo() {
    nav(`/members/${newMemberId}`);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Add member</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AvatarPicker name={name || 'New'} avatarUrl={avatarUrl} onChange={setAvatarUrl} />

        <label className="block">
          <span className="block text-sm font-medium text-slate-800 mb-1">Name</span>
          <input
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="space-y-2">
          <Textarea
            label="Describe their routine (optional)"
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            hint='e.g. "Maria fica em casa de segunda a sexta das 8h às 9h e das 18h às 23h. Nos fins de semana, fica o dia todo."'
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleExtract}
            disabled={extract.isPending || !prompt.trim()}
          >
            {extract.isPending ? 'Extracting…' : 'Extract routine'}
          </Button>
          {extract.isError && (
            <p className="text-xs text-rose-600">{(extract.error as Error).message}</p>
          )}
        </div>

        <RoutineEditor slots={slots} onChange={setSlots} />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => nav(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMember.isPending}>
            {createMember.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>

      {newMemberId && (
        <Dialog
          title="Re-infer product durations?"
          message="Do you want to re-infer all product durations based on this new member's presence?"
          confirmLabel="Yes, re-infer"
          cancelLabel="Skip"
          loading={reInferAll.isPending}
          onConfirm={handleReInferYes}
          onCancel={handleReInferNo}
        />
      )}
    </div>
  );
}
