import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CubeIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail]       = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState(''); // shown until email service is ready
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setResetToken(data.data?.resetToken || '');
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="card p-8 space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-xl shadow-primary-900/50">
              <CubeIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Reset your password</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>
          </div>

          {submitted ? (
            /* Success state */
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-900/30 border border-emerald-800/50 flex items-center justify-center">
                  <EnvelopeIcon className="w-7 h-7 text-emerald-400" />
                </div>
                <p className="text-slate-300 text-sm">
                  Request processed for <span className="text-slate-100 font-medium">{email}</span>
                </p>
              </div>

              {/* Dev-only: show token since email isn't wired up yet */}
              {resetToken && (
                <div className="bg-amber-900/20 border border-amber-800/40 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-400">
                    🔧 Dev mode — email not configured yet
                  </p>
                  <p className="text-xs text-slate-400">Use this token to reset your password:</p>
                  <div className="bg-surface rounded p-2 break-all">
                    <code className="text-xs text-amber-300">{resetToken}</code>
                  </div>
                  <Link
                    to={`/reset-password/${resetToken}`}
                    className="btn-primary w-full text-xs py-1.5 mt-1 block text-center"
                  >
                    Reset password with this token →
                  </Link>
                </div>
              )}

              <Link to="/login" className="btn-secondary w-full block text-center text-sm">
                Back to sign in
              </Link>
            </div>
          ) : (
            /* Request form */
            <>
              {error && (
                <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2.5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="forgot-email" className="text-xs font-medium text-slate-400">
                    Email address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="input"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    'Send reset link'
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500">
                Remember it?{' '}
                <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
