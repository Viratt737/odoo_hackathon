import { useEffect, useState } from 'react';
import api from '../services/api';

const statCards = [
  { label: 'Total Assets',        value: '—', color: 'text-primary-400' },
  { label: 'Allocated',           value: '—', color: 'text-amber-400' },
  { label: 'Under Maintenance',   value: '—', color: 'text-orange-400' },
  { label: 'Pending Bookings',    value: '—', color: 'text-emerald-400' },
];

const Dashboard = () => {
  const [health, setHealth] = useState(null);

  // ✅ End-to-end test — hits the backend /api/health route
  useEffect(() => {
    api.get('/health')
      .then(({ data }) => setHealth(data.message))
      .catch(() => setHealth('❌ Backend unreachable'));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Overview of your enterprise assets</p>
      </div>

      {/* Backend health banner */}
      <div className="card flex items-center gap-3 py-3">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-sm text-slate-400">
          Backend status: <span className="text-slate-200 font-medium">{health ?? 'Checking…'}</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, color }) => (
          <div key={label} className="card">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
            <p className="text-xs text-slate-600 mt-1">Data loads in Phase 2</p>
          </div>
        ))}
      </div>

      {/* Placeholder chart area */}
      <div className="card h-64 flex items-center justify-center">
        <p className="text-slate-600 text-sm">📊 Charts &amp; Activity Feed — Phase 2</p>
      </div>
    </div>
  );
};

export default Dashboard;
