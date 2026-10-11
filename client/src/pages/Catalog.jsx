import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../api';
import ProductCard from '../components/ProductCard';

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [type, setType] = useState(params.get('type') || params.get('category') || '');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('newest');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Телефоны', 'Аксессуары']);
  const [error, setError] = useState('');

  useEffect(() => {
    setType(params.get('category') || params.get('type') || '');
  }, [params]);

  useEffect(() => {
    let live = true;
    api.get('/products/categories')
      .then(response => {
        if (live && Array.isArray(response.data) && response.data.length) setCategories(response.data);
      })
      .catch(() => {
        // Keep the fallback categories if the categories endpoint is temporarily unavailable.
      });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    let live = true;
    const query = new URLSearchParams();
    if (type) query.set('category', type);
    if (q.trim()) query.set('q', q.trim());
    if (sort) query.set('sort', sort);

    setError('');
    api.get('/products?' + query.toString())
      .then(response => live && setProducts(Array.isArray(response.data) ? response.data : []))
      .catch(() => {
        if (live) {
          setProducts([]);
          setError('Не удалось загрузить товары. Проверьте подключение к серверу.');
        }
      });
    return () => { live = false; };
  }, [type, q, sort]);

  const selectCategory = category => {
    setType(category);
    setParams(category ? { category } : {});
  };

  return (
    <main className="container-shell min-h-[70vh] pb-12 pt-8 md:pt-12">
      <p className="eyebrow">НАЙДИ СВОЁ УСТРОЙСТВО</p>
      <h1 className="page-title mb-7">Каталог<span className="text-accent">.</span></h1>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="search-box">
          <Search size={18} />
          <input value={q} onChange={event => setQ(event.target.value)} placeholder="Поиск по названию или бренду..." />
        </label>
        <select className="field" value={sort} onChange={event => setSort(event.target.value)}>
          <option value="newest">Сначала новые</option>
          <option value="cheap">Сначала дешевле</option>
          <option value="expensive">Сначала дороже</option>
        </select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => selectCategory('')} className={`rounded-xl border px-4 py-2 text-sm ${type === '' ? 'border-accent bg-accent text-ink' : 'border-white/10 text-slate-300'}`}>
          Все товары
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => selectCategory(category)}
            className={`rounded-xl border px-4 py-2 text-sm ${type === category ? 'border-accent bg-accent text-ink' : 'border-white/10 text-slate-300'}`}
          >
            {category}
          </button>
        ))}
      </div>

      {error ? (
        <div className="empty-state">{error}</div>
      ) : products.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map(product => <ProductCard key={product._id} product={product} />)}
        </div>
      ) : (
        <div className="empty-state">Товаров пока нет в этой категории. Попробуйте выбрать другую категорию.</div>
      )}
    </main>
  );
}
