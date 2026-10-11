import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, ShieldCheck, Headphones, MapPin } from 'lucide-react';
import api from '../api';
import ProductCard from '../components/ProductCard';

const benefits = [
  { Icon: Truck, title: 'Доставка по городу', description: 'Удобно и быстро' },
  { Icon: ShieldCheck, title: 'Проверенная техника', description: 'Внимание к качеству' },
  { Icon: Headphones, title: 'Помощь с выбором', description: 'Поддержка покупателей' },
];

function ProductSkeleton() {
  return (
    <div className="product-skeleton" aria-hidden="true">
      <div className="skeleton product-skeleton-image" />
      <div className="skeleton product-skeleton-line" />
      <div className="skeleton product-skeleton-line product-skeleton-line-short" />
      <div className="skeleton product-skeleton-price" />
    </div>
  );
}

function ProductGrid({ products, loading }) {
  if (loading) {
    return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <ProductSkeleton key={index} />)}</div>;
  }

  if (!products.length) {
    return <div className="empty-state">Товары временно недоступны. Попробуйте обновить страницу немного позже.</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => <ProductCard key={product._id} product={product} />)}
    </div>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    api.get('/products?sort=newest')
      .then(({ data }) => {
        if (!active) return;
        if (!Array.isArray(data)) throw new Error('API_INVALID_RESPONSE');
        setProducts(data);
      })
      .catch((error) => {
        if (!active) return;
        setApiUnavailable(true);
        console.error('Unable to load products:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const featuredProducts = products.filter((product) => product.featured).slice(0, 4);
  const visibleProducts = featuredProducts.length ? featuredProducts : products.slice(0, 8);

  return (
    <main className="container-shell space-y-14 pb-10 pt-8 md:pt-12">
      <section className="hero-panel relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-12 sm:px-10 md:px-16 md:py-16">
        <div className="relative z-10 max-w-2xl">
          <p className="eyebrow">ТЕХНОЛОГИИ НА КАЖДЫЙ ДЕНЬ</p>
          <h1 className="mt-6 text-4xl font-black leading-tight text-white sm:text-5xl md:text-7xl">
            Твой следующий<br /><span className="text-accent">уровень.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">Смартфоны и аксессуары по выгодным ценам. Выбирай свою технологию.</p>
          <Link to="/catalog" className="btn-primary mt-8">Смотреть каталог <ArrowRight size={18} /></Link>
        </div>
        <div className="hero-orb" aria-hidden="true">
          <div className="orb-ring" />
          <img src="https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&w=900&q=85" alt="" className="hero-phone" fetchPriority="high" />
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div><p className="eyebrow">ВЫБИРАЙ СВОЁ</p><h2 className="section-title">Категории</h2></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link to="/catalog?type=Телефоны" className="category-tile">
            <div><p className="text-xs font-bold text-accent">01 / MOBILE</p><h3 className="mt-3 text-2xl font-extrabold text-white">Смартфоны</h3><p className="mt-2 text-sm text-slate-400">Мощность в твоих руках</p></div>
            <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80" alt="Смартфон" loading="lazy" />
          </Link>
          <Link to="/catalog?type=Аксессуары" className="category-tile">
            <div><p className="text-xs font-bold text-accent">02 / GEAR</p><h3 className="mt-3 text-2xl font-extrabold text-white">Аксессуары</h3><p className="mt-2 text-sm text-slate-400">Детали решают всё</p></div>
            <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80" alt="Аксессуары" loading="lazy" />
          </Link>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div><p className="eyebrow">ВЫБИРАЙ СВОЁ</p><h2 className="section-title">Популярные товары</h2></div>
          <Link to="/catalog" className="text-sm font-bold text-accent">Весь каталог →</Link>
        </div>
        {apiUnavailable && <p className="mb-4 text-sm text-slate-400" role="status">Каталог сейчас не отвечает. Витрина останется доступной, пока сервис восстанавливается.</p>}
        <ProductGrid products={visibleProducts} loading={loading} />
      </section>

      <section className="grid gap-3 rounded-3xl border border-white/5 bg-panel p-5 sm:grid-cols-3">
        {benefits.map(({ Icon, title, description }) => (
          <div key={title} className="flex gap-3 p-3">
            <Icon className="text-accent" />
            <div><h3 className="font-bold text-white">{title}</h3><p className="text-sm text-slate-400">{description}</p></div>
          </div>
        ))}
      </section>
      <section className="about-map-panel overflow-hidden rounded-3xl border border-white/10">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <p className="eyebrow"><MapPin size={15} /> НАЙДИ НАС</p>
            <h2 className="section-title mt-3">Наш магазин</h2>
            <p className="mt-4 flex items-start gap-3 text-sm leading-7 text-slate-300 sm:text-base">
              <MapPin className="mt-1 shrink-0 text-accent" size={20} />
              <span>Метро «Сходненская», выход № 1, торговый центр «Оранжевый мир», 3-й этаж, магазин «Арзон Маркет», Москва.</span>
            </p>
            <a href="https://yandex.ru/maps/?text=%D0%BC%D0%B5%D1%82%D1%80%D0%BE%20%D0%A1%D1%85%D0%BE%D0%B4%D0%BD%D0%B5%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%2C%20%D0%B2%D1%8B%D1%85%D0%BE%D0%B4%20%E2%84%96%201%2C%20%D0%A2%D0%A6%20%D0%9E%D1%80%D0%B0%D0%BD%D0%B6%D0%B5%D0%B2%D1%8B%D0%B9%20%D0%BC%D0%B8%D1%80%2C%203%20%D1%8D%D1%82%D0%B0%D0%B6%2C%20%D0%90%D1%80%D0%B7%D0%BE%D0%BD%20%D0%9C%D0%B0%D1%80%D0%BA%D0%B5%D1%82%2C%20%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0" target="_blank" rel="noreferrer" className="btn-secondary mt-5 inline-flex">
              <MapPin size={17} /> Открыть в Яндекс Картах <ArrowRight size={17} />
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <iframe
              title="Arzon Market на Яндекс Картах"
              src="https://yandex.ru/map-widget/v1/?text=%D0%BC%D0%B5%D1%82%D1%80%D0%BE%20%D0%A1%D1%85%D0%BE%D0%B4%D0%BD%D0%B5%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%2C%20%D0%B2%D1%8B%D1%85%D0%BE%D0%B4%20%E2%84%96%201%2C%20%D0%A2%D0%A6%20%D0%9E%D1%80%D0%B0%D0%BD%D0%B6%D0%B5%D0%B2%D1%8B%D0%B9%20%D0%BC%D0%B8%D1%80%2C%203%20%D1%8D%D1%82%D0%B0%D0%B6%2C%20%D0%90%D1%80%D0%B7%D0%BE%D0%BD%20%D0%9C%D0%B0%D1%80%D0%BA%D0%B5%D1%82%2C%20%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0"
              width="100%"
              height="360"
              loading="lazy"
              allowFullScreen
              className="block w-full"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
