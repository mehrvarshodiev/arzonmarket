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
    localStorage.setItem('am_token', data.token);
    localStorage.setItem('am_user', JSON.stringify(data.user));
    localStorage.setItem('am_auth_type', data.sessionType || 'phone');
    setToken(data.token);
    setUser(data.user);
  }, []);

  useEffect(() => {
    // Only Telegram sessions use the revocable opaque session endpoint.
    // Existing phone/code auth remains untouched.
    if (localStorage.getItem('am_auth_type') !== 'telegram') return;
    let active = true;
    api.get('/auth/telegram/session')
      .then(({ data }) => {
        if (!active) return;
        if (data?.user) {
          localStorage.setItem('am_user', JSON.stringify(data.user));
          setUser(data.user);
        } else {
          clearLocalSession();
        }
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
    if (!data?.token || !data?.user) throw new Error('Ответ авторизации некорректен.');
    save({ ...data, sessionType: 'telegram' });
    return data;
  }, [save]);

  const logout = useCallback(async () => {
    const currentToken = token || localStorage.getItem('am_token');
    try {
      if (currentToken && localStorage.getItem('am_auth_type') === 'telegram') {
        await api.post('/auth/telegram/logout', {}, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
      }
    } catch {
      // Clear local state even if the network is unavailable; server sessions expire automatically.
    } finally {
      clearLocalSession();
    }
  }, [token, clearLocalSession]);

  const value = useMemo(() => ({
    token, user, isAuthenticated: Boolean(token), isAdmin: user?.role === 'admin',
    requestCode, verifyCode, loginTelegram, logout
  }), [token, user, requestCode, verifyCode, loginTelegram, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
