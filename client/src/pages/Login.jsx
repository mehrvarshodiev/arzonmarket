import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { LoaderCircle, Send, ShoppingBag, LogOut, ShieldCheck, UserRound, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export default function Login() {
  const { user, isAuthenticated, loginTelegram, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [waitingForTelegram, setWaitingForTelegram] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => () => { cancelled.current = true; }, []);

  const startTelegramLogin = useCallback(async () => {
    setBusy(true);
    setError('');
    setWaitingForTelegram(false);
    cancelled.current = false;
    try {
      const { data: challenge } = await api.post('/auth/telegram/challenge');
      if (!challenge?.deepLink || !challenge?.challengeId || !challenge?.pollToken) throw new Error('Не удалось создать ссылку входа.');
      setWaitingForTelegram(true);
      window.open(challenge.deepLink, '_blank', 'noopener,noreferrer');
      const deadline = Date.now() + 5 * 60 * 1000;
      while (!cancelled.current && Date.now() < deadline) {
        await wait(2000);
        if (cancelled.current) break;
        try {
          const { data } = await api.get('/auth/telegram/poll', { params: { id: challenge.challengeId, token: challenge.pollToken } });
          if (data?.token && data?.user) {
            await loginTelegram(data);
            nav(location.state?.from?.pathname || '/', { replace: true });
            return;
          }
        } catch (pollError) {
          if (pollError.response?.status === 202) continue;
          throw pollError;
        }
      }
      if (!cancelled.current) setError('Время входа истекло. Нажмите кнопку и попробуйте снова.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Не удалось войти через Telegram. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
      setWaitingForTelegram(false);
    }
  }, [loginTelegram, nav, location.state]);

  return (
    <main className="container-shell grid min-h-[70vh] place-items-center py-12">
      <section className="auth-card w-full max-w-md rounded-3xl border border-white/10 bg-panel p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-ink"><UserRound /></span>
        <h1 className="mt-5 text-3xl font-black text-white">{isAuthenticated ? 'Ваш профиль' : 'Войти в ArzonMarket'}</h1>
        {isAuthenticated ? (
          <>
            <p className="mt-3 text-slate-400">{user?.name || (user?.telegramId ? 'Аккаунт Telegram подключён' : 'Вы вошли в аккаунт.')}</p>
            {user?.telegramId && <p className="mt-1 text-sm text-slate-500">Telegram ID: {user.telegramId}</p>}
            <Link to="/catalog" className="btn-primary mt-5 w-full"><ShoppingBag size={17} /> Перейти в каталог</Link>
            <Link to="/cart" className="btn-secondary mt-3 w-full"><ShoppingBag size={17} /> Моя корзина</Link>
            {user?.role === 'admin' && <Link to="/admin" className="btn-secondary mt-3 w-full"><ShieldCheck size={17} /> Панель администратора</Link>}
            <button onClick={() => { logout(); setError(''); }} className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-500 transition hover:text-red-300"><LogOut size={16} /> Выйти</button>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-slate-400">Войдите через существующего Telegram-бота ArzonMarket. В боте нажмите Start — сайт проверит подтверждение и создаст профиль.</p>
            {error && <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-400">{error}</p>}
            <button type="button" disabled={busy} onClick={startTelegramLogin} className="telegram-login-button w-full">
              {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
              {busy ? 'Ожидаем подтверждение в Telegram…' : 'Войти через Telegram'}
            </button>
            {waitingForTelegram && <p className="flex items-center justify-center gap-2 text-sm text-slate-400"><CheckCircle2 size={16} /> Откройте существующий бот и нажмите Start. Ссылка действует 5 минут.</p>}
            <p className="text-center text-xs leading-5 text-slate-500">Роль определяется сервером. Покупатель получает роль customer; роль admin выдаётся только Telegram ID из TELEGRAM_ADMIN_IDS.</p>
          </div>
        )}
      </section>
    </main>
  );
}
