import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CubeIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';

const Signup = () => {
  const { signup } = useAuth();
  const navigate   = useNavigate();

  const [form, setForm]               = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShow]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  // Client-side validation before hitting the API
  const validate = () => {
    if (!form.name.trim())               return 'Full name is required';
    if (!form.email)                     return 'Email is required';
    if (form.password.length < 8)        return 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password, form.confirmPassword);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message ?? 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getStrength = () => {
    const p = form.password;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8)           score++;
    if (/[A-Z]/.test(p))        score++;
    if (/[0-9]/.test(p))        score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-400', 'bg-emerald-500'];
    return { score, label: labels[score - 1] || 'Weak', color: colors[score - 1] || 'bg-red-500' };
  };
  const strength = getStrength();

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-900/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-800/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="card p-8 space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-xl shadow-primary-900/50">
              <CubeIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Create an account</h1>
              <p className="text-sm text-slate-500 mt-0.5">Join AssetFlow as an Employee</p>
            </div>
          </div>

          {/* Info banner — no role selection */}
          <div className="flex items-start gap-2.5 bg-primary-900/20 border border-primary-800/40 rounded-lg px-3 py-2.5">
            <span className="text-primary-400 mt-0.5">ℹ️</span>
            <p className="text-xs text-slate-400 leading-relaxed">
              All new accounts are created as <span className="text-primary-400 font-medium">Employee</span>.
              Role upgrades are assigned by an Administrator.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2.5">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div className="space-y-1">
              <label htmlFor="signup-name" className="text-xs font-medium text-slate-400">
                Full name
              </label>
              <input
                id="signup-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Jane Smith"
                className="input"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label htmlFor="signup-email" className="text-xs font-medium text-slate-400">
                Email address
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                className="input"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label htmlFor="signup-password" className="text-xs font-medium text-slate-400">
                Password <span className="text-slate-600">(min. 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input pr-10"
                />
                <button type="button" onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {strength && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-surface-border'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500">{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1">
              <label htmlFor="signup-confirm" className="text-xs font-medium text-slate-400">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="signup-confirm"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`input pr-10 ${
                    form.confirmPassword && form.password !== form.confirmPassword
                      ? 'ring-2 ring-red-500/50 border-red-500/50'
                      : form.confirmPassword && form.password === form.confirmPassword
                      ? 'ring-2 ring-emerald-500/50 border-emerald-500/50'
                      : ''
                  }`}
                />
                <button type="button" onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors" tabIndex={-1}>
                  {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
