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
  const [telegramLink, setTelegramLink] = useState('');
  const cancelled = useRef(false);
  const widgetContainer = useRef(null);
  const [botUsername, setBotUsername] = useState(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '');
  const [widgetConfigLoaded, setWidgetConfigLoaded] = useState(Boolean(import.meta.env.VITE_TELEGRAM_BOT_USERNAME));

  useEffect(() => () => { cancelled.current = true; }, []);

  const finishTelegramLogin = useCallback(async (telegramData) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/auth/telegram/widget', telegramData);
      await loginTelegram(data);
      nav(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Не удалось войти через Telegram. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  }, [loginTelegram, nav, location.state]);

  useEffect(() => {
    if (isAuthenticated || botUsername || widgetConfigLoaded) return undefined;
    let active = true;
    api.get('/auth/telegram/config')
      .then(({ data }) => { if (active) setBotUsername(String(data?.username || '')); })
      .catch(() => { /* Keep the existing bot challenge login as a fallback. */ })
      .finally(() => { if (active) setWidgetConfigLoaded(true); });
    return () => { active = false; };
  }, [botUsername, widgetConfigLoaded, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || !botUsername || !widgetContainer.current) return undefined;
    window.onTelegramAuth = (telegramData) => { void finishTelegramLogin(telegramData); };
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-lang', 'ru');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    widgetContainer.current.appendChild(script);
    return () => {
      script.remove();
      delete window.onTelegramAuth;
    };
  }, [botUsername, finishTelegramLogin, isAuthenticated]);

  const startTelegramLogin = useCallback(async () => {
    setBusy(true);
    setError('');
    setWaitingForTelegram(false);
    setTelegramLink('');
    cancelled.current = false;
    try {
      const { data: challenge } = await api.post('/auth/telegram/challenge');
      if (!challenge?.deepLink || !challenge?.challengeId || !challenge?.pollToken) throw new Error('Не удалось создать ссылку входа.');
      setWaitingForTelegram(true);
      setTelegramLink(challenge.deepLink);
      const deadline = Date.now() + 5 * 60 * 1000;
      while (!cancelled.current && Date.now() < deadline) {
        await wait(2000);
        if (cancelled.current) break;
        try {
          const { data } = await api.get('/auth/telegram/poll', { params: { id: challenge.challengeId, token: challenge.pollToken } });
          if (data?.user && data?.sessionType === 'telegram') {
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
            <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt="Аватар Telegram" referrerPolicy="no-referrer" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white/10 text-slate-300"><UserRound size={26} /></span>
              )}
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{user?.name || 'Покупатель'}</p>
                {user?.username && <p className="truncate text-sm text-slate-400">@{user.username}</p>}
                {user?.telegramId && <p className="mt-1 text-xs text-slate-500">Telegram ID: {user.telegramId}</p>}
              </div>
            </div>
            <Link to="/catalog" className="btn-primary mt-5 w-full"><ShoppingBag size={17} /> Перейти в каталог</Link>
            <Link to="/cart" className="btn-secondary mt-3 w-full"><ShoppingBag size={17} /> Моя корзина</Link>
            {user?.role === 'admin' && <Link to="/admin" className="btn-secondary mt-3 w-full"><ShieldCheck size={17} /> Панель администратора</Link>}
            <button onClick={() => { void logout(); setError(''); }} className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-500 transition hover:text-red-300"><LogOut size={16} /> Выйти</button>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-slate-400">Войдите через Telegram. После подтверждения сайт проверит подпись данных на сервере и создаст профиль покупателя.</p>
            {error && <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-400">{error}</p>}
            {botUsername ? (
              <div className="flex min-h-12 justify-center" ref={widgetContainer} aria-label="Войти через Telegram" />
            ) : !widgetConfigLoaded ? (
              <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm text-slate-400"><LoaderCircle size={17} className="animate-spin" /> Загружаем Telegram…</div>
            ) : (
              <button type="button" disabled={busy} onClick={startTelegramLogin} className="telegram-login-button w-full">
                {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
                {busy ? 'Ожидаем подтверждение в Telegram…' : 'Войти через Telegram'}
              </button>
            )}
            {botUsername && <button type="button" disabled={busy} onClick={startTelegramLogin} className="telegram-login-button w-full">
              {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
              {busy ? 'Ожидаем подтверждение в Telegram…' : 'Войти через Telegram-бота'}
            </button>}
            {busy && botUsername && <p className="text-center text-sm text-slate-400"><LoaderCircle size={15} className="mr-2 inline animate-spin" /> Проверяем подпись Telegram…</p>}
            {waitingForTelegram && <div className="space-y-2 rounded-xl bg-white/5 p-3 text-center"><p className="flex items-center justify-center gap-2 text-sm text-slate-400"><CheckCircle2 size={16} /> Ссылка действует 5 минут. Откройте бот и нажмите Start.</p><a href={telegramLink} target="_blank" rel="noreferrer" className="btn-secondary w-full"><Send size={17} /> Открыть Telegram</a></div>}
            {widgetConfigLoaded && !botUsername && <p className="text-center text-xs leading-5 text-slate-500">Используется существующий безопасный вход через Telegram-бота.</p>}
            <p className="text-center text-xs leading-5 text-slate-500">Роль определяется сервером. Покупатель получает роль customer; роль admin выдаётся только Telegram ID из TELEGRAM_ADMIN_IDS.</p>
          </div>
        )}
      </section>
    </main>
  );
}
