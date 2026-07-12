import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout          from './components/Layout';
import Login           from './pages/Login';
import Dashboard       from './pages/Dashboard';
import OrgSetup        from './pages/OrgSetup';
import AssetDirectory  from './pages/AssetDirectory';
import Allocation      from './pages/Allocation';
import Booking         from './pages/Booking';
import Maintenance     from './pages/Maintenance';
import Audit           from './pages/Audit';
import Reports         from './pages/Reports';
import Notifications   from './pages/Notifications';

// Guard: redirect to /login if not authenticated
// NOTE: For Phase 1 scaffolding, auth guard is relaxed so the app is browsable without a backend.
// In Phase 2, flip `allowGuest` to false.
const ProtectedRoute = ({ children, allowGuest = true }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!allowGuest && !isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login" element={<Login />} />

    {/* Protected — Layout wraps all authenticated pages */}
    <Route
      element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard"       element={<Dashboard />} />
      <Route path="org-setup"       element={<OrgSetup />} />
      <Route path="assets"          element={<AssetDirectory />} />
      <Route path="allocation"      element={<Allocation />} />
      <Route path="booking"         element={<Booking />} />
      <Route path="maintenance"     element={<Maintenance />} />
      <Route path="audit"           element={<Audit />} />
      <Route path="reports"         element={<Reports />} />
      <Route path="notifications"   element={<Notifications />} />
    </Route>

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;
