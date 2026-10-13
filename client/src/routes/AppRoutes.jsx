import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import AppLoader from '../components/AppLoader';
import ProtectedRoute from '../components/ProtectedRoute';
import NotFound from '../pages/NotFound';

const Home = lazy(() => import('../pages/Home'));
const About = lazy(() => import('../pages/About'));
const Catalog = lazy(() => import('../pages/Catalog'));
const Product = lazy(() => import('../pages/Product'));
const Cart = lazy(() => import('../pages/Cart'));
const Login = lazy(() => import('../pages/Login'));
const Admin = lazy(() => import('../pages/Admin'));

const SITE_URL = 'https://arzonmarket-omega.vercel.app';

const PAGE_METADATA = {
  '/': {
    title: 'ArzonMarket — смартфоны и аксессуары по доступным ценам',
    description: 'Смартфоны, гаджеты и аксессуары по доступным ценам. Изучайте товары и выбирайте технику в ArzonMarket.',
    indexable: true,
  },
  '/catalog': {
    title: 'Каталог смартфонов и аксессуаров — ArzonMarket',
    description: 'Выбирайте смартфоны, гаджеты и аксессуары в каталоге ArzonMarket. Сравнивайте цены и находите нужную технику.',
    indexable: true,
  },
  '/about': {
    title: 'О магазине ArzonMarket — техника по разумным ценам',
    description: 'Узнайте больше об ArzonMarket: наш подход к выбору техники, доступным ценам и поддержке покупателей.',
    indexable: true,
  },
  '/cart': {
    title: 'Корзина — ArzonMarket',
    description: 'Проверьте выбранные товары в корзине ArzonMarket.',
    indexable: false,
  },
  '/login': {
    title: 'Вход — ArzonMarket',
    description: 'Войдите в ArzonMarket, чтобы продолжить работу с магазином.',
    indexable: false,
  },
  '/admin': {
    title: 'Панель администратора — ArzonMarket',
    description: 'Управление магазином ArzonMarket.',
    indexable: false,
  },
};

function ensureMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function RouteMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, '') || '/';
    const isProduct = /^\/product\/[^/]+$/.test(path);
    const page = PAGE_METADATA[path] || (isProduct
      ? {
          title: 'Товар — ArzonMarket',
          description: 'Информация о товаре, характеристики и цена в ArzonMarket.',
          indexable: true,
        }
      : {
          title: 'Страница не найдена — ArzonMarket',
          description: 'Запрошенная страница не найдена. Перейдите в каталог ArzonMarket.',
          indexable: false,
        });

    document.title = page.title;
    ensureMeta('meta[name="description"]', { name: 'description', content: page.description });
    ensureMeta('meta[name="robots"]', {
      name: 'robots',
      content: page.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow',
    });
    ensureMeta('meta[property="og:title"]', { property: 'og:title', content: page.title });
    ensureMeta('meta[property="og:description"]', { property: 'og:description', content: page.description });
    ensureMeta('meta[property="og:url"]', { property: 'og:url', content: SITE_URL + path });
    ensureMeta('meta[property="og:type"]', { property: 'og:type', content: isProduct ? 'product' : 'website' });
    ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: page.title });
    ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: page.description });

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = SITE_URL + path;
  }, [pathname]);

  return null;
}

/**
 * Centralizes route metadata and lazy-loads page bundles on demand.
 */
export default function AppRoutes() {
  return (
    <>
      <RouteMetadata />
      <Suspense fallback={<AppLoader message="Открываем страницу…" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute admin>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
