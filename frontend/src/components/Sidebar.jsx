import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  BuildingOfficeIcon,
  CubeIcon,
  ArrowsRightLeftIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  BellIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard',     label: 'Dashboard',        Icon: HomeIcon },
  { to: '/org-setup',     label: 'Organisation',     Icon: BuildingOfficeIcon },
  { to: '/assets',        label: 'Asset Directory',  Icon: CubeIcon },
  { to: '/allocation',    label: 'Allocation',       Icon: ArrowsRightLeftIcon },
  { to: '/booking',       label: 'Booking',          Icon: CalendarDaysIcon },
  { to: '/maintenance',   label: 'Maintenance',      Icon: WrenchScrewdriverIcon },
  { to: '/audit',         label: 'Audit',            Icon: ClipboardDocumentCheckIcon },
  { to: '/reports',       label: 'Reports',          Icon: ChartBarIcon },
  { to: '/notifications', label: 'Notifications',    Icon: BellIcon },
];

const Sidebar = () => {
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-surface-card border-r border-surface-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-900/40">
          <CubeIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 tracking-wide">AssetFlow</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Enterprise</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Main Menu
        </p>
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
          >
            <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: '18px', height: '18px' }} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-surface-border">
        <NavLink
          to="/settings"
          className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
        >
          <Cog6ToothIcon className="shrink-0" style={{ width: '18px', height: '18px' }} />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
