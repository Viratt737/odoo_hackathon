import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Map route paths to human-readable page titles
const pageTitles = {
  '/dashboard':     'Dashboard',
  '/org-setup':     'Organisation Setup',
  '/assets':        'Asset Directory',
  '/allocation':    'Allocation',
  '/booking':       'Booking',
  '/maintenance':   'Maintenance',
  '/audit':         'Audit Cycles',
  '/reports':       'Reports',
  '/notifications': 'Notifications',
  '/settings':      'Settings',
};

const Layout = () => {
  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] ?? 'AssetFlow';

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
