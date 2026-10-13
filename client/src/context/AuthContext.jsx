import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import api from '../api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('am_token'));
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('am_user') || 'null'); } catch { return null; } });
  const save = useCallback(data => { localStorage.setItem('am_token', data.token); localStorage.setItem('am_user', JSON.stringify(data.user)); setToken(data.token); setUser(data.user); }, []);
  const requestCode = useCallback(phone => api.post('/auth/request-code', { phone }), []);
  const verifyCode = useCallback(async (phone, code, name) => { const { data } = await api.post('/auth/verify-code', { phone, code, name }); save(data); return data; }, [save]);
  const loginTelegram = useCallback(async payload => { const { data } = await api.post('/auth/telegram', payload); save(data); return data; }, [save]);
  const logout = useCallback(() => { localStorage.removeItem('am_token'); localStorage.removeItem('am_user'); setToken(null); setUser(null); }, []);
  const value = useMemo(() => ({ token, user, isAuthenticated: Boolean(token), isAdmin: user?.role === 'admin', requestCode, verifyCode, loginTelegram, logout }), [token, user, requestCode, verifyCode, loginTelegram, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
