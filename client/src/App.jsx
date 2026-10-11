import { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Smartphone, Phone, Instagram, Send, ArrowUpRight } from 'lucide-react';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AppLoader from './components/AppLoader';

const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Product = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));

function Footer() {
  return (
    <footer className="site-footer mb-20 border-t md:mb-0">
      <div className="container-shell py-9 sm:py-11">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-12">
          <div>
            <Link to="/" className="brand-mark inline-flex items-center gap-2 font-black">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
                <Smartphone size={20} className="text-accent" />
              </span>
              <span className="text-lg text-white">arzon<span className="text-accent">market</span></span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Технологии ближе. Выбирайте нужное и оставайтесь на связи с ArzonMarket.
            </p>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Связаться с нами</h2>
            <a
              href="tel:+9262770808"
              className="group mt-4 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-accent/40 hover:bg-accent/5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Phone size={18} />
              </span>
              <span>
                <span className="block text-xs text-slate-500">Телефон магазина</span>
                <span className="mt-1 block font-semibold text-white group-hover:text-accent">+9262770808</span>
              </span>
            </a>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Мы в соцсетях</h2>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href="https://instagram.com/arzon_market_ru"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-pink-400/40 hover:bg-pink-500/5"
                aria-label="Instagram ArzonMarket"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
                    <Instagram size={19} />
                  </span>
                  <span>
                    <span className="block text-xs text-slate-500">Instagram</span>
                    <span className="mt-1 block font-semibold text-white group-hover:text-pink-300">@arzon_market_ru</span>
                  </span>
                </span>
                <ArrowUpRight size={17} className="text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-pink-300" />
              </a>
              <a
                href="https://t.me/ARZON_MARKET_RU"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-sky-400/40 hover:bg-sky-500/5"
                aria-label="Telegram ArzonMarket"
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                    <Send size={19} />
                  </span>
                  <span>
                    <span className="block text-xs text-slate-500">Telegram</span>
                    <span className="mt-1 block font-semibold text-white group-hover:text-sky-300">@ARZON_MARKET_RU</span>
                  </span>
                </span>
                <ArrowUpRight size={17} className="text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-sky-300" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/[0.08] pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Технологии ближе.</p>
          <p>© {new Date().getFullYear()} ArzonMarket. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-ink text-slate-200">
      <Navbar />
      <div className="flex flex-1 flex-col">
      <Suspense fallback={<AppLoader message="Открываем страницу…" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute admin><Admin /></ProtectedRoute>} />
          <Route path="*" element={
            <main className="container-shell py-24 text-center">
              <h1 className="text-4xl font-black text-white">404</h1>
              <p className="mt-3 text-slate-400">Страница не найдена</p>
              <Link to="/" className="btn-primary mt-6">На главную</Link>
            </main>
          } />
        </Routes>
      </Suspense>
      </div>
      <Footer />
    </div>
  );
}
