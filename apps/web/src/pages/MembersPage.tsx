import { Link } from 'react-router-dom';
import { useMembers } from '../api/queries';
import Button from '../components/Button';

export default function MembersPage() {
  const { data: members = [], isLoading } = useMembers();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Household</h1>
        <Link to="/members/new">
          <Button>Add member</Button>
        </Link>
      </header>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-700 font-medium">No members yet.</p>
          <p className="text-sm text-slate-500">
            Add the people in your household so HomeStock knows who consumes what.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                to={`/members/${m.id}`}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50"
              >
                <span className="grid place-items-center h-10 w-10 rounded-full bg-slate-200 text-sm font-bold text-slate-700">
                  {initials(m.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{m.name}</span>
                  <span className="block text-xs text-slate-500">
                    {m.weeklyPresenceHours}h/week at home
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('');
}
