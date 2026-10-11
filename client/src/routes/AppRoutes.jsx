import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
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

/**
 * Keeps route definitions in one place and lazy-loads page bundles on demand.
 */
export default function AppRoutes() {
  return (
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
  );
}
