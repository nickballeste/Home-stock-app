import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateMember, useExtractRoutine } from '../api/queries';
import { Input, Textarea } from '../components/Input';
import Button from '../components/Button';
import RoutineEditor, { type EditableSlot } from '../components/RoutineEditor';

export default function AddMemberPage() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [slots, setSlots] = useState<EditableSlot[]>([]);

  const createMember = useCreateMember();
  const extract = useExtractRoutine();

  // Routine for an unsaved member uses a deferred replace after creation.
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
    const member = await createMember.mutateAsync({ name });
    if (slots.length > 0) {
      await replaceRoutineForId(member.id);
    }
    nav(`/members/${member.id}`);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Add member</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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
    </div>
  );
}
