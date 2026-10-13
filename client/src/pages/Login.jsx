import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, ShoppingBag, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [message, setMessage] = useState('');

  return (
    <main className="container-shell grid min-h-[70vh] place-items-center py-12">
      <section className="auth-card w-full max-w-md rounded-3xl border border-white/10 bg-panel p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-ink"><UserRound /></span>
        <h1 className="mt-5 text-3xl font-black text-white">{isAuthenticated ? 'Ваш профиль' : 'Войти в ArzonMarket'}</h1>
        {isAuthenticated ? (
          <>
            <p className="mt-3 text-slate-400">{user?.name || 'Покупатель'}</p>
            {user?.phone && <p className="mt-1 text-sm text-slate-500">{user.phone}</p>}
            <Link to="/catalog" className="btn-primary mt-5 w-full"><ShoppingBag size={17} /> Перейти в каталог</Link>
            <Link to="/cart" className="btn-secondary mt-3 w-full"><ShoppingBag size={17} /> Моя корзина</Link>
            {isAdmin && <Link to="/admin" className="btn-secondary mt-3 w-full"><ShieldCheck size={17} /> Панель администратора</Link>}
            <button onClick={() => { logout(); setMessage(''); }} className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-500 transition hover:text-red-300"><LogOut size={16} /> Выйти</button>
          </>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-slate-400">Авторизация через Telegram временно отключена.</p>
            {message && <p role="status" className="rounded-xl bg-white/5 p-3 text-sm text-slate-400">{message}</p>}
            <button type="button" onClick={() => setMessage('Вход через Telegram сейчас отключён. Кнопка сохранена в интерфейсе сайта.')} className="telegram-login-button w-full">
              <Send size={18} />
              Войти через Telegram
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
