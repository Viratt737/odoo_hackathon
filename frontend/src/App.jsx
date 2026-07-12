import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }    from './context/AuthContext';
import ProtectedRoute      from './components/ProtectedRoute';
import Layout              from './components/Layout';

// Public pages
import Login          from './pages/Login';
import Signup         from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword  from './pages/ResetPassword';

// Protected pages
import Dashboard      from './pages/Dashboard';
import OrgSetup       from './pages/OrgSetup';
import AssetDirectory from './pages/AssetDirectory';
import Allocation     from './pages/Allocation';
import Booking        from './pages/Booking';
import Maintenance    from './pages/Maintenance';
import Audit          from './pages/Audit';
import Reports        from './pages/Reports';
import Notifications  from './pages/Notifications';

/**
 * PublicOnlyRoute — redirect authenticated users away from login/signup
 * so they don't land on the login page while already signed in.
 */
import { useAuth } from './context/AuthContext';
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* ── Public (unauthenticated only) ──────────────────────────────────── */}
    <Route path="/login"  element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
    <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/reset-password/:token" element={<ResetPassword />} />

    {/* ── Protected (all authenticated users — Layout wraps them) ────────── */}
    <Route
      element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }
    >
      <Route index element={<Navigate to="/dashboard" replace />} />

      {/* All authenticated users */}
      <Route path="dashboard"     element={<Dashboard />} />
      <Route path="booking"       element={<Booking />} />
      <Route path="notifications" element={<Notifications />} />

      {/* Asset Manager + Admin */}
      <Route path="assets"      element={
        <ProtectedRoute roles={['Admin', 'AssetManager', 'DepartmentHead']}>
          <AssetDirectory />
        </ProtectedRoute>
      } />
      <Route path="allocation"  element={
        <ProtectedRoute roles={['Admin', 'AssetManager']}>
          <Allocation />
        </ProtectedRoute>
      } />
      <Route path="maintenance" element={
        <ProtectedRoute roles={['Admin', 'AssetManager']}>
          <Maintenance />
        </ProtectedRoute>
      } />
      <Route path="audit"       element={
        <ProtectedRoute roles={['Admin', 'AssetManager']}>
          <Audit />
        </ProtectedRoute>
      } />

      {/* Department Head + Admin */}
      <Route path="org-setup" element={
        <ProtectedRoute roles={['Admin', 'DepartmentHead']}>
          <OrgSetup />
        </ProtectedRoute>
      } />
      <Route path="reports"   element={
        <ProtectedRoute roles={['Admin', 'AssetManager', 'DepartmentHead']}>
          <Reports />
        </ProtectedRoute>
      } />
    </Route>

    {/* ── Fallback ──────────────────────────────────────────────────────── */}
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
