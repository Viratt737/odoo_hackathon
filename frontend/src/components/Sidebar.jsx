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
import { useAuth } from '../hooks/useAuth';

/**
 * NAV ITEMS — role-based visibility
 *
 * roles: undefined  → visible to ALL authenticated users
 * roles: [...]      → visible only to users whose role is in the array
 *
 * Role hierarchy for reference:
 *   Admin          → sees everything
 *   AssetManager   → asset-centric modules
 *   DepartmentHead → org + reports
 *   Employee       → personal modules only
 */
const ALL_ROLES = ['Admin', 'AssetManager', 'DepartmentHead', 'Employee'];

const navItems = [
  {
    to:    '/dashboard',
    label: 'Dashboard',
    Icon:  HomeIcon,
    roles: ALL_ROLES, // everyone
  },
  {
    to:    '/org-setup',
    label: 'Organisation',
    Icon:  BuildingOfficeIcon,
    roles: ['Admin', 'DepartmentHead'],
  },
  {
    to:    '/assets',
    label: 'Asset Directory',
    Icon:  CubeIcon,
    roles: ['Admin', 'AssetManager', 'DepartmentHead'],
  },
  {
    to:    '/allocation',
    label: 'Allocation',
    Icon:  ArrowsRightLeftIcon,
    roles: ['Admin', 'AssetManager'],
  },
  {
    to:    '/booking',
    label: 'Booking',
    Icon:  CalendarDaysIcon,
    roles: ALL_ROLES, // everyone can book
  },
  {
    to:    '/maintenance',
    label: 'Maintenance',
    Icon:  WrenchScrewdriverIcon,
    roles: ['Admin', 'AssetManager'],
  },
  {
    to:    '/audit',
    label: 'Audit',
    Icon:  ClipboardDocumentCheckIcon,
    roles: ['Admin', 'AssetManager'],
  },
  {
    to:    '/reports',
    label: 'Reports',
    Icon:  ChartBarIcon,
    roles: ['Admin', 'AssetManager', 'DepartmentHead'],
  },
  {
    to:    '/notifications',
    label: 'Notifications',
    Icon:  BellIcon,
    roles: ALL_ROLES, // everyone
  },
];

// Role badge colour mapping
const roleBadgeStyle = {
  Admin:          'bg-primary-900/50 text-primary-300 ring-primary-800',
  AssetManager:   'bg-emerald-900/50 text-emerald-300 ring-emerald-800',
  DepartmentHead: 'bg-amber-900/50 text-amber-300 ring-amber-800',
  Employee:       'bg-slate-800 text-slate-400 ring-slate-700',
};

const roleLabel = {
  Admin:          'Admin',
  AssetManager:   'Asset Mgr',
  DepartmentHead: 'Dept. Head',
  Employee:       'Employee',
};

const Sidebar = () => {
  const { user } = useAuth();
  const userRole = user?.role;

  // Filter nav items the current user is allowed to see
  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

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

      {/* User info (role badge) */}
      {user && (
        <div className="px-4 py-3 border-b border-surface-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.03]">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white">{user.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${roleBadgeStyle[userRole] || roleBadgeStyle.Employee}`}>
                {roleLabel[userRole] || userRole}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
          Main Menu
        </p>
        {visibleItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
          >
            <Icon style={{ width: '18px', height: '18px' }} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Settings footer */}
      <div className="px-3 py-4 border-t border-surface-border">
        <NavLink
          to="/settings"
          className={({ isActive }) => isActive ? 'nav-link-active' : 'nav-link'}
        >
          <Cog6ToothIcon style={{ width: '18px', height: '18px' }} className="shrink-0" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};

export default Sidebar;
