import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('assetflow_token'));
  const [loading, setLoading] = useState(true);

  // ── On mount: validate token with the server (/auth/me) ──────────────────
  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem('assetflow_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.data.user);
        setToken(storedToken);
      } catch {
        // Token invalid / expired — clear everything
        localStorage.removeItem('assetflow_token');
        localStorage.removeItem('assetflow_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    validateSession();
  }, []); // runs once on mount

  // ── Persist user to localStorage whenever it changes ─────────────────────
  useEffect(() => {
    if (user) {
      localStorage.setItem('assetflow_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('assetflow_user');
    }
  }, [user]);

  // ─────────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { token: jwt, user: userData } = data.data;
    localStorage.setItem('assetflow_token', jwt);
    setToken(jwt);
    setUser(userData);
    return userData;
  }, []);

  const signup = useCallback(async (name, email, password, confirmPassword) => {
    const { data } = await api.post('/auth/signup', {
      name,
      email,
      password,
      confirmPassword,
    });
    // Signup returns a token too — log them straight in
    const { token: jwt, user: userData } = data.data;
    localStorage.setItem('assetflow_token', jwt);
    setToken(jwt);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore — clear locally regardless
    } finally {
      localStorage.removeItem('assetflow_token');
      localStorage.removeItem('assetflow_user');
      setToken(null);
      setUser(null);
    }
  }, []);

  /**
   * hasRole('Admin')                    → true if user.role === 'Admin'
   * hasRole('Admin', 'AssetManager')    → true if user.role is either
   */
  const hasRole = useCallback(
    (...roles) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    signup,
    logout,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
