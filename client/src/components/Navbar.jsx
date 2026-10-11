import { Link, NavLink } from 'react-router-dom';
import { House, ShoppingBag, ShoppingCart, UserRound, ShieldCheck, Smartphone } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
const links = [{ to: '/', label: 'Главная', icon: House }, { to: '/catalog', label: 'Каталог', icon: ShoppingBag }, { to: '/cart', label: 'Корзина', icon: ShoppingCart }];
export default function Navbar() {
  const { count } = useCart(); const { user, isAdmin } = useAuth();
  return <>
    <header className="sticky top-0 z-40 hidden border-b border-white/5 bg-ink/80 backdrop-blur-xl md:block"><div className="container-shell flex h-[76px] items-center justify-between">
      <Link to="/" className="flex items-center gap-3 font-black tracking-tight text-white"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-ink"><Smartphone size={22}/></span><span className="text-xl">arzon<span className="text-accent">market</span></span></Link>
      <nav className="flex items-center gap-2">{links.map(l => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({isActive}) => `rounded-xl px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}>{l.label}</NavLink>)}</nav>
      <div className="flex items-center gap-3"><Link to="/login" className="btn-secondary !px-4 !py-2"><UserRound size={16}/>{user?.name || user?.phone || 'Войти'}</Link>{isAdmin && <Link to="/admin" className="icon-btn" aria-label="Админ"><ShieldCheck size={18}/></Link>}<Link to="/cart" className="btn-primary !px-4 !py-2">Корзина <span className="rounded-full bg-black/10 px-2 py-0.5">{count}</span></Link></div>
    </div></header>
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0b0e14]/95 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl md:hidden"><nav className="mx-auto grid max-w-lg grid-cols-4 gap-1">{[...links, {to:'/login',label:'Профиль',icon:UserRound}].map(l => { const Icon=l.icon; return <NavLink key={l.to} to={l.to} end={l.to==='/'} className={({isActive})=>`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold ${isActive?'text-accent':'text-slate-500'}`}><span className="relative"><Icon size={21}/>{l.to==='/cart'&&count>0&&<span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] text-ink">{count}</span>}</span>{l.label}</NavLink>})}</nav></div>
  </>;
}
