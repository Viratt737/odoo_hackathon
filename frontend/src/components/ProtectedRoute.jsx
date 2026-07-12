import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * ProtectedRoute
 *
 * Props:
 *   children  — what to render if authenticated (and role matches)
 *   roles     — optional array of allowed roles; if omitted, any auth'd user can access
 *
 * Behaviour:
 *   1. While auth state is resolving → show a full-page spinner
 *   2. Not authenticated → redirect to /login (preserving the intended URL)
 *   3. Wrong role → show a 403 "Access Denied" inline message
 *   4. All good → render children
 */
const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // 1. Still resolving session (validating token against /auth/me)
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  // 2. Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Role check (if roles prop is provided)
  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center space-y-4 py-12">
          <div className="text-5xl">🚫</div>
          <h2 className="text-xl font-bold text-slate-100">Access Denied</h2>
          <p className="text-slate-400 text-sm">
            Your role (<span className="text-primary-400 font-medium">{user?.role}</span>) does not
            have permission to view this page.
          </p>
          <p className="text-slate-500 text-xs">
            Required: {roles.join(' or ')}
          </p>
          <Navigate to="/dashboard" replace />
        </div>
      </div>
    );
  }

  // 4. Authenticated + role OK
  return children;
};

export default ProtectedRoute;
