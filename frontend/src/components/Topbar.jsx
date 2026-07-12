import { BellIcon, MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

const Topbar = ({ pageTitle = 'Dashboard' }) => {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-surface-card border-b border-surface-border shrink-0">
      {/* Left — page title */}
      <h1 className="text-base font-semibold text-slate-100">{pageTitle}</h1>

      {/* Right — search + actions */}
      <div className="flex items-center gap-3">
        {/* Search (stub) */}
        <div className="relative hidden sm:block">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search assets..."
            className="input pl-9 w-56 h-9 text-xs"
          />
        </div>

        {/* Notification bell */}
        <button className="btn-ghost relative p-2 rounded-lg">
          <BellIcon className="w-5 h-5" />
          {/* Unread badge stub */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-surface-card" />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <UserCircleIcon className="w-8 h-8 text-slate-400 group-hover:text-slate-200 transition-colors" />
          <div className="hidden md:block">
            <p className="text-xs font-medium text-slate-200 leading-none">{user?.name ?? 'Guest'}</p>
            <p className="text-[10px] text-slate-500 capitalize">{user?.role ?? 'Viewer'}</p>
          </div>
        </div>

        {/* Logout */}
        <button onClick={logout} className="btn-secondary text-xs py-1.5 px-3">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Topbar;
