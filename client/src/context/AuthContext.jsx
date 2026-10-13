import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('am_token'));
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
    // Telegram credentials stay in an HttpOnly cookie; only phone auth keeps its existing token storage.
    if (data.token) localStorage.setItem('am_token', data.token);
    else localStorage.removeItem('am_token');
    localStorage.setItem('am_user', JSON.stringify(data.user));
    localStorage.setItem('am_auth_type', data.sessionType || 'phone');
    setToken(data.token || null);
    setUser(data.user);
  }, []);

  useEffect(() => {
    if (localStorage.getItem('am_auth_type') !== 'telegram') return undefined;
    let active = true;
    api.get('/auth/telegram/session')
      .then(({ data }) => {
        if (!active) return;
        if (data?.user) {
          localStorage.setItem('am_user', JSON.stringify(data.user));
          setUser(data.user);
          setToken(null);
          localStorage.removeItem('am_token');
        } else clearLocalSession();
      })
      .catch(() => { if (active) clearLocalSession(); });
    return () => { active = false; };
  }, [clearLocalSession]);

  const requestCode = useCallback((phone) => api.post('/auth/request-code', { phone }), []);
  const verifyCode = useCallback(async (phone, code, name) => {
    const { data } = await api.post('/auth/verify-code', { phone, code, name });
    save({ ...data, sessionType: 'phone' });
    return data;
  }, [save]);

  const loginTelegram = useCallback(async (data) => {
    if (!data?.user) throw new Error('Ответ авторизации некорректен.');
    save({ ...data, sessionType: 'telegram' });
    return data;
  }, [save]);

  const logout = useCallback(async () => {
    const currentToken = token || localStorage.getItem('am_token');
    try {
      if (localStorage.getItem('am_auth_type') === 'telegram') {
        await api.post('/auth/telegram/logout', {}, currentToken
          ? { headers: { Authorization: `Bearer ${currentToken}` } }
          : undefined);
      }
    } catch {
      // Always clear the UI; server-side sessions have a seven-day expiry as a fallback.
    } finally {
      clearLocalSession();
    }
  }, [token, clearLocalSession]);

  const value = useMemo(() => ({
    token, user, isAuthenticated: Boolean(user), isAdmin: user?.role === 'admin',
    requestCode, verifyCode, loginTelegram, logout
  }), [token, user, requestCode, verifyCode, loginTelegram, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
