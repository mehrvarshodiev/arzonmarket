import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    if (localStorage.getItem('am_auth_type') === 'telegram') {
      localStorage.removeItem('am_token');
      localStorage.removeItem('am_user');
      localStorage.removeItem('am_auth_type');
      return null;
    }
    return localStorage.getItem('am_token');
  });
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('am_user') || 'null'); } catch { return null; }
  });

  const clearLocalSession = useCallback(() => {
    localStorage.removeItem('am_token');
    localStorage.removeItem('am_user');
    localStorage.removeItem('am_auth_type');
    setToken(null);
    setUser(null);
  }, []);

  const save = useCallback((data) => {
    if (data.token) localStorage.setItem('am_token', data.token);
    else localStorage.removeItem('am_token');
    localStorage.setItem('am_user', JSON.stringify(data.user));
    localStorage.setItem('am_auth_type', 'phone');
    setToken(data.token || null);
    setUser(data.user);
  }, []);

  const requestCode = useCallback((phone) => api.post('/auth/request-code', { phone }), []);
  const verifyCode = useCallback(async (phone, code, name) => {
    const { data } = await api.post('/auth/verify-code', { phone, code, name });
    save(data);
    return data;
  }, [save]);

  const logout = useCallback(() => clearLocalSession(), [clearLocalSession]);

  const value = useMemo(() => ({
    token, user, isAuthenticated: Boolean(token), isAdmin: user?.role === 'admin',
    requestCode, verifyCode, logout
  }), [token, user, requestCode, verifyCode, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
