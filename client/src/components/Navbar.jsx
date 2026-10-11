import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { House, ShoppingBag, ShoppingCart, UserRound, ShieldCheck, Smartphone, Sun, Moon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const links = [
  { to: '/', label: 'Главная', icon: House },
  { to: '/catalog', label: 'Каталог', icon: ShoppingBag },
  { to: '/cart', label: 'Корзина', icon: ShoppingCart }
];

function Brand({ compact = false }) {
  return <Link to="/" aria-label="ArzonMarket — на главную" className="brand-mark flex shrink-0 items-center gap-2.5 font-black tracking-tight">
    <span className="brand-icon grid h-10 w-10 place-items-center rounded-2xl bg-accent text-ink shadow-glow"><Smartphone size={22}/></span>
    <span className={compact ? 'text-lg' : 'text-xl'}>arzon<span className="text-accent">market</span></span>
  </Link>;
}

function ThemeSwitcher({ mobile = false }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return <button type="button" onClick={toggleTheme} className={`theme-switch ${mobile ? 'theme-switch-mobile' : ''}`}
    aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
    title={isDark ? 'Светлая тема' : 'Тёмная тема'} aria-pressed={!isDark}>
    <span className="theme-switch-icon">{isDark ? <Sun size={17}/> : <Moon size={17}/>}</span>
    {!mobile && <span className="theme-switch-label">{isDark ? 'Светлая' : 'Тёмная'}</span>}
  </button>;
}

export default function Navbar() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const [headerHidden, setHeaderHidden] = useState(false);
  const previousScrollY = useRef(0);

  useEffect(() => {
    previousScrollY.current = window.scrollY;
    let ticking = false;

    const updateHeader = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - previousScrollY.current;
      if (currentY < 80) setHeaderHidden(false);
      else if (Math.abs(delta) > 6) setHeaderHidden(delta > 0);
      previousScrollY.current = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <>
    <header className={`site-header sticky top-0 z-40 border-b backdrop-blur-xl ${headerHidden ? "site-header-hidden" : "site-header-visible"}`} data-header-hidden={headerHidden}>
      <div className="container-shell flex h-[68px] items-center justify-between gap-3 md:h-[76px]">
        <Brand compact />
        <nav className="desktop-nav hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {links.map(l => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({isActive}) => `rounded-xl px-3 py-2 text-sm font-semibold transition lg:px-4 ${isActive ? 'nav-link-active' : 'nav-link'}`}>{l.label}</NavLink>)}
        </nav>
        <div className="header-actions flex items-center gap-2">
          <ThemeSwitcher />
          <Link to="/login" className="btn-secondary header-login hidden !px-3 !py-2 md:inline-flex" aria-label="Войти в профиль"><UserRound size={17}/><span className="hidden lg:inline">{user?.name || user?.phone || 'Войти'}</span></Link>
          {isAdmin && <Link to="/admin" className="icon-btn hidden md:inline-flex" aria-label="Админ"><ShieldCheck size={18}/></Link>}
          <Link to="/cart" className="btn-primary header-cart !px-3 !py-2" aria-label={`Корзина, товаров: ${count}`}><ShoppingCart size={17}/><span className="hidden sm:inline">Корзина</span><span className="cart-count rounded-full bg-black/10 px-2 py-0.5">{count}</span></Link>
        </div>
      </div>
    </header>
    <div className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl md:hidden">
      <nav className="mx-auto grid max-w-lg grid-cols-4 gap-1" aria-label="Мобильная навигация">
        {[...links, {to:'/login',label:'Профиль',icon:UserRound}].map(l => { const Icon=l.icon; return <NavLink key={l.to} to={l.to} end={l.to==='/'} className={({isActive})=>`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${isActive?'text-accent':'mobile-nav-link'}`}><span className="relative"><Icon size={21}/>{l.to==='/cart'&&count>0&&<span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] text-ink">{count}</span>}</span>{l.label}</NavLink>})}
      </nav>
    </div>
  </>;
}
