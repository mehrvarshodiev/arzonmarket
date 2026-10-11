import { lazy, Suspense } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AppLoader from './components/AppLoader';

const Home = lazy(() => import('./pages/Home'));
const Catalog = lazy(() => import('./pages/Catalog'));
const Product = lazy(() => import('./pages/Product'));
const Cart = lazy(() => import('./pages/Cart'));
const Login = lazy(() => import('./pages/Login'));
const Admin = lazy(() => import('./pages/Admin'));

function Footer() {
  return (
    <footer className="site-footer mb-20 border-t md:mb-0">
      <div className="container-shell flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/" className="brand-mark flex items-center gap-2 font-black">
          <Smartphone size={18} className="text-accent" />
          arzon<span className="text-accent">market</span>
        </Link>
        <p className="text-xs text-slate-500">Технологии ближе. © {new Date().getFullYear()} ArzonMarket.</p>
        <Link to="/catalog" className="text-sm text-slate-400 hover:text-accent">Перейти в каталог</Link>
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
