import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { LoaderCircle, Send, ShoppingBag, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, isAuthenticated, loginTelegram, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const telegramWidgetRef = useRef(null);
  // Never fall back to the admin bot: buyer login must use its own dedicated bot.
  const [telegramBotUsername, setTelegramBotUsername] = useState('');
  const [telegramConfigReady, setTelegramConfigReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadTelegramConfig = useCallback(async () => {
    setTelegramConfigReady(false);
    setError('');
    try {
      const { data } = await api.get('/auth/telegram/config');
      if (!data?.username) throw new Error('Telegram-бот не найден. Проверьте настройки бота.');
      setTelegramBotUsername(String(data.username).replace(/^@/, ''));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Не удалось подключить Telegram. Попробуйте ещё раз.');
    } finally {
      setTelegramConfigReady(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/auth/telegram/config')
      .then(({ data }) => {
        if (active && data?.username) setTelegramBotUsername(String(data.username).replace(/^@/, ''));
      })
      .catch(() => {
        if (active) setError('Не удалось подключить Telegram. Нажмите кнопку ниже, чтобы повторить попытку.');
      })
      .finally(() => { if (active) setTelegramConfigReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!telegramBotUsername || isAuthenticated || !telegramWidgetRef.current) return undefined;
    const container = telegramWidgetRef.current;
    container.replaceChildren();
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.dataset.telegramLogin = telegramBotUsername;
    script.dataset.size = 'large';
    script.dataset.radius = '12';
    script.dataset.userpic = 'false';
    script.dataset.onauth = 'onTelegramAuth(user)';
    window.onTelegramAuth = async telegramUser => {
      setBusy(true);
      setError('');
      try {
        await loginTelegram(telegramUser);
        nav(location.state?.from?.pathname || '/', { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || 'Не удалось войти через Telegram. Попробуйте ещё раз.');
      } finally {
        setBusy(false);
      }
    };
    script.onerror = () => setError('Не удалось загрузить Telegram. Проверьте подключение и попробуйте ещё раз.');
    container.appendChild(script);
    return () => {
      script.remove();
      delete window.onTelegramAuth;
    };
  }, [telegramBotUsername, isAuthenticated, loginTelegram, nav, location.state]);

  return (
    <main className="container-shell grid min-h-[70vh] place-items-center py-12">
      <section className="auth-card w-full max-w-md rounded-3xl border border-white/10 bg-panel p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-ink">
          <UserRound />
        </span>
        <h1 className="mt-5 text-3xl font-black text-white">
          {isAuthenticated ? 'Ваш профиль' : 'Войти в ArzonMarket'}
        </h1>
        {isAuthenticated ? (
          <>
            <p className="mt-3 text-slate-400">
              {user?.name || (user?.telegramId ? 'Аккаунт Telegram подключён' : 'Вы вошли в аккаунт.')}
            </p>
            {user?.telegramId && <p className="mt-1 text-sm text-slate-500">Telegram ID: {user.telegramId}</p>}
            <Link to="/catalog" className="btn-primary mt-5 w-full">
              <ShoppingBag size={17} /> Перейти в каталог
            </Link>
            <Link to="/cart" className="btn-secondary mt-3 w-full">
              <ShoppingBag size={17} /> Моя корзина
            </Link>
            {user?.role === 'admin' && (
              <Link to="/admin" className="btn-secondary mt-3 w-full">
                <ShieldCheck size={17} /> Панель администратора
              </Link>
            )}
            <button
              onClick={() => { logout(); setError(''); }}
              className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-500 transition hover:text-red-300"
            >
              <LogOut size={16} /> Выйти
            </button>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-slate-400">
              Создайте аккаунт покупателя через отдельного Telegram-бота ArzonMarket. Этот вход не даёт доступа к административному боту.
            </p>
            {error && <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-400">{error}</p>}
            <div className="flex min-h-12 items-center justify-center">
              {telegramBotUsername ? (
                <div ref={telegramWidgetRef} className="telegram-widget-slot" aria-label="Продолжить через Telegram" />
              ) : (
                <button
                  type="button"
                  disabled={!telegramConfigReady || busy}
                  onClick={loadTelegramConfig}
                  className="telegram-login-button"
                >
                  {telegramConfigReady ? <Send size={18} /> : <LoaderCircle size={18} className="animate-spin" />}
                  {telegramConfigReady ? 'Продолжить через Telegram' : 'Подключаем Telegram…'}
                </button>
              )}
            </div>
            {busy && (
              <p className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <LoaderCircle size={16} className="animate-spin" /> Создаём ваш профиль…
              </p>
            )}
            <p className="text-center text-xs leading-5 text-slate-500">
              Telegram передаст сайту только доступные данные профиля. Номер телефона не передаётся. Аккаунт покупателя и админ-бот разделены.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
