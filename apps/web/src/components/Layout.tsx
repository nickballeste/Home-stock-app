import { NavLink, Outlet } from 'react-router-dom';
import { useAlertSummary } from '../api/queries';

export default function Layout() {
  const { data: summary } = useAlertSummary();
  const alertCount = (summary?.totalAlerts ?? 0) + (summary?.totalOverdue ?? 0);

  const links: Array<{ to: string; label: string; badge?: number }> = [
    { to: '/', label: 'Dashboard', badge: alertCount > 0 ? alertCount : undefined },
    { to: '/products', label: 'Products' },
    { to: '/members', label: 'Members' },
    { to: '/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) / topbar (mobile) */}
      <aside className="md:w-60 md:min-h-screen border-b md:border-b-0 md:border-r bg-white">
        <div className="p-4 md:p-6">
          <h1 className="text-lg font-bold tracking-tight">HomeStock</h1>
          <p className="text-xs text-slate-500">Always-on home stock</p>
        </div>
        <nav className="px-2 md:px-4 pb-4 flex md:block gap-1 md:gap-2 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-ink text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <span className="inline-flex items-center gap-2">
                {l.label}
                {l.badge !== undefined && (
                  <span className="bg-rose-500 text-white text-xs rounded-full px-2 py-0.5">
                    {l.badge}
                  </span>
                )}
              </span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-4 md:px-8 py-6 md:py-10 max-w-5xl">
        <Outlet />
      </main>
    </div>
  );
}
