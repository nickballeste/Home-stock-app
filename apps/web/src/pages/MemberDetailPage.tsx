import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useDeleteMember,
  useExtractRoutine,
  useMember,
  useMemberRoutine,
  useReplaceRoutine,
  useUpdateMember,
} from '../api/queries';
import { Textarea } from '../components/Input';
import Button from '../components/Button';
import RoutineEditor, { type EditableSlot } from '../components/RoutineEditor';
import AvatarPicker from '../components/AvatarPicker';
import type { DayOfWeek } from '@homestock/types';

export default function MemberDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { data: member } = useMember(id);
  const { data: routine } = useMemberRoutine(id);
  const updateMember = useUpdateMember(id);
  const replaceRoutine = useReplaceRoutine(id);
  const deleteMember = useDeleteMember();
  const extract = useExtractRoutine();

  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [slots, setSlots] = useState<EditableSlot[]>([]);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setAvatarUrl(member.avatarUrl);
    }
  }, [member]);

  useEffect(() => {
    if (routine) {
      setSlots(
        routine.slots.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek as DayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      );
    }
  }, [routine]);

  async function saveAll() {
    await updateMember.mutateAsync({ name, avatarUrl });
    await replaceRoutine.mutateAsync(
      slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    );
  }

  async function handleExtract() {
    if (!prompt.trim()) return;
    const result = await extract.mutateAsync(prompt);
    setSlots(result.slots.map((s) => ({ ...s, id: crypto.randomUUID() })));
  }

  if (!member) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6 max-w-xl">
      <header>
        <Link to="/members" className="text-xs text-slate-500 hover:underline">
          ← Members
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{member.name}</h1>
        <p className="text-sm text-slate-500">{member.weeklyPresenceHours}h/week at home</p>
      </header>

      <AvatarPicker name={name} avatarUrl={avatarUrl} onChange={setAvatarUrl} />

      <label className="block">
        <span className="block text-sm font-medium text-slate-800 mb-1">Name</span>
        <input
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <div className="space-y-2">
        <Textarea
          label="Re-describe routine (optional)"
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleExtract}
          disabled={extract.isPending || !prompt.trim()}
        >
          {extract.isPending ? 'Extracting…' : 'Re-extract from text'}
        </Button>
      </div>

      <RoutineEditor slots={slots} onChange={setSlots} />

      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="danger"
          onClick={async () => {
            if (!confirm('Delete this member?')) return;
            await deleteMember.mutateAsync(id);
            nav('/members');
          }}
        >
          Delete
        </Button>
        <Button onClick={saveAll} disabled={updateMember.isPending || replaceRoutine.isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}
