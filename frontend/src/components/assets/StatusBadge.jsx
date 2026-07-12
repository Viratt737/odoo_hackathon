/**
 * StatusBadge — color-coded asset lifecycle state badge
 */
const STATUS_STYLES = {
  Available:        'bg-emerald-900/40 text-emerald-300 ring-emerald-800/60',
  Allocated:        'bg-blue-900/40   text-blue-300   ring-blue-800/60',
  Reserved:         'bg-amber-900/40  text-amber-300  ring-amber-800/60',
  UnderMaintenance: 'bg-orange-900/40 text-orange-300 ring-orange-800/60',
  Lost:             'bg-red-900/40    text-red-300    ring-red-800/60',
  Retired:          'bg-slate-800     text-slate-400  ring-slate-700/60',
  Disposed:         'bg-slate-900     text-slate-500  ring-slate-800/60',
};

const STATUS_DOTS = {
  Available:        'bg-emerald-400',
  Allocated:        'bg-blue-400',
  Reserved:         'bg-amber-400',
  UnderMaintenance: 'bg-orange-400 animate-pulse',
  Lost:             'bg-red-500',
  Retired:          'bg-slate-500',
  Disposed:         'bg-slate-600',
};

const STATUS_LABELS = {
  Available:        'Available',
  Allocated:        'Allocated',
  Reserved:         'Reserved',
  UnderMaintenance: 'Under Maintenance',
  Lost:             'Lost',
  Retired:          'Retired',
  Disposed:         'Disposed',
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Available;
  const dot   = STATUS_DOTS[status]   || STATUS_DOTS.Available;
  const label = STATUS_LABELS[status] || status;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {label}
    </span>
  );
};

export default StatusBadge;
export { STATUS_STYLES, STATUS_LABELS, STATUS_DOTS };
