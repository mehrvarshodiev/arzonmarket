import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { House, ShoppingBag, ShoppingCart, UserRound, ShieldCheck, Smartphone, Sun, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const links = [
  { to: '/', label: 'Главная', icon: House },
  { to: '/catalog', label: 'Каталог', icon: ShoppingBag },
  { to: '/about', label: 'О нас', icon: Info },
  { to: '/cart', label: 'Корзина', icon: ShoppingCart }
];

function Brand({ compact = false }) {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return <Link to="/" onClick={handleClick} aria-label="ArzonMarket — на главную" className="brand-mark flex shrink-0 items-center gap-2.5 font-black tracking-tight">
    <span className="brand-icon grid h-10 w-10 place-items-center rounded-2xl bg-accent text-ink shadow-glow"><Smartphone size={22}/></span>
    <span className={compact ? 'text-lg' : 'text-xl'}>arzon<span className="text-accent">market</span></span>
  </Link>;
}

function ThemeSwitcher({ mobile = false }) {
  const { toggleTheme } = useTheme();
  return <button type="button" onClick={toggleTheme} className={`theme-switch ${mobile ? 'theme-switch-mobile' : ''}`}
    aria-label="Сайт использует светлую тему"
    title="Светлая тема" aria-pressed={true}>
    <span className="theme-switch-icon"><Sun size={17}/></span>
    {!mobile && <span className="theme-switch-label">Светлая</span>}
  </button>;
}

export default function Navbar() {
  const { count } = useCart();
  const { isAdmin } = useAuth();
  const [headerHidden, setHeaderHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const previousScrollY = useRef(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, []);

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
    <div className="page-scroll-progress" aria-hidden="true">
      <div className="page-scroll-progress-fill" style={{ width: scrollProgress + '%' }} />
    </div>
    <header className={`site-header sticky top-0 z-40 border-b backdrop-blur-xl ${headerHidden ? "site-header-hidden" : "site-header-visible"}`} data-header-hidden={headerHidden}>
      <div className="container-shell flex h-[68px] items-center justify-between gap-3 md:h-[76px]">
        <Brand compact />
        <nav className="desktop-nav hidden items-center gap-1 md:flex" aria-label="Основная навигация">
          {links.filter(l => l.to !== '/cart').map(l => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({isActive}) => `rounded-xl px-3 py-2 text-sm font-semibold transition lg:px-4 ${isActive ? 'nav-link-active' : 'nav-link'}`}>{l.label}</NavLink>)}
        </nav>
        <div className="header-actions flex items-center gap-2">
          <ThemeSwitcher />
          {isAdmin && <Link to="/admin" className="icon-btn hidden md:inline-flex" aria-label="Админ"><ShieldCheck size={18}/></Link>}
          <Link to="/cart" className="btn-primary header-cart !px-3 !py-2" aria-label={`Корзина, товаров: ${count}`}><ShoppingCart size={17}/><span className="hidden sm:inline">Корзина</span><span className="cart-count rounded-full bg-black/10 px-2 py-0.5">{count}</span></Link>
        </div>
      </div>
    </header>
    <div className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl md:hidden">
      <nav className="mx-auto grid max-w-lg grid-cols-5 gap-1" aria-label="Мобильная навигация">
        {[...links, {to:'/login',label:'Профиль',icon:UserRound}].map(l => { const Icon=l.icon; return <NavLink key={l.to} to={l.to} end={l.to==='/'} className={({isActive})=>`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${isActive?'text-accent':'mobile-nav-link'}`}><span className="relative"><Icon size={21}/>{l.to==='/cart'&&count>0&&<span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] text-ink">{count}</span>}</span>{l.label}</NavLink>})}
      </nav>
    </div>
  </>;
}
