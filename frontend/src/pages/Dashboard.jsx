import { useEffect, useState } from 'react';
import { CubeIcon, UserGroupIcon, WrenchScrewdriverIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const statCards = [
  { label: 'Total Assets',       value: '—', subtext: 'across all departments', color: 'text-primary-400',  Icon: CubeIcon },
  { label: 'Allocated',          value: '—', subtext: 'active allocations',     color: 'text-amber-400',   Icon: UserGroupIcon },
  { label: 'Under Maintenance',  value: '—', subtext: 'open requests',          color: 'text-orange-400',  Icon: WrenchScrewdriverIcon },
  { label: 'Pending Bookings',   value: '—', subtext: 'awaiting approval',      color: 'text-emerald-400', Icon: CalendarDaysIcon },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [apiStatus, setApiStatus] = useState({ state: 'loading', message: '' });

  useEffect(() => {
    api.get('/health')
      .then(({ data }) => setApiStatus({ state: 'ok', message: data.message }))
      .catch(() => setApiStatus({ state: 'error', message: 'Backend unreachable — is the server running?' }));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Welcome */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Here's what's happening across your assets today.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 card py-2 px-3">
          <span className={`w-2 h-2 rounded-full ${apiStatus.state === 'ok' ? 'bg-emerald-400 animate-pulse' : apiStatus.state === 'error' ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
          <span className="text-xs text-slate-400">
            {apiStatus.state === 'loading' ? 'Connecting…' : apiStatus.state === 'ok' ? 'API Online' : 'API Offline'}
          </span>
        </div>
      </div>

      {/* Error banner if backend down */}
      {apiStatus.state === 'error' && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-400 text-lg">⚠️</span>
          <p className="text-sm text-red-300">{apiStatus.message}</p>
        </div>
      )}

      {/* Role badge */}
      <div className="card flex items-center gap-3 py-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
        </div>
        <div>
          <p className="text-sm text-slate-300 font-medium">{user?.name}</p>
          <p className="text-xs text-slate-500">{user?.email} · <span className="text-primary-400">{user?.role}</span></p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, subtext, color, Icon }) => (
          <div key={label} className="card group hover:border-primary-800/60 transition-colors duration-200">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-primary-900/30 transition-colors">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold mt-3 ${color}`}>{value}</p>
            <p className="text-xs text-slate-600 mt-1">{subtext}</p>
          </div>
        ))}
      </div>

      {/* Placeholder chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 h-64 flex items-center justify-center">
          <p className="text-slate-600 text-sm">📊 Asset Status Chart — Phase 3</p>
        </div>
        <div className="card h-64 flex items-center justify-center">
          <p className="text-slate-600 text-sm">📋 Recent Activity — Phase 3</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
