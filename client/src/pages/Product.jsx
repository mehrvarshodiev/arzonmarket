import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, ShieldCheck, ChevronLeft, ChevronRight, Check, Truck, RotateCcw, Images } from 'lucide-react';
import api from '../api';
import { useCart } from '../context/CartContext';

const money = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(n) || 0);
const fallbackImage = 'https://placehold.co/800x800/f4f5f7/8a95a5?text=ArzonMarket';
const swatches = { 'черный':'#171717','чёрный':'#171717','black':'#171717','белый':'#f8fafc','white':'#f8fafc','серый':'#9ca3af','gray':'#9ca3af','grey':'#9ca3af','синий':'#2563eb','blue':'#2563eb','красный':'#dc2626','red':'#dc2626','зеленый':'#16a34a','зелёный':'#16a34a','green':'#16a34a','фиолетовый':'#9333ea','розовый':'#ec4899','pink':'#ec4899','золотой':'#d4a72c' };

export default function Product() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();

  useEffect(() => {
    let live = true;
    setProduct(null); setError(''); setActiveImage(0);
    api.get('/products/' + id).then(r => { if (live) setProduct(r.data); })
      .catch(() => { if (live) setError('Не удалось загрузить этот товар. Возможно, он был удалён или временно недоступен.'); });
    return () => { live = false; };
  }, [id]);

  const images = useMemo(() => {
    const list = Array.isArray(product?.images) ? product.images.filter(x => typeof x === 'string' && x.trim()) : [];
    return list.length ? [...new Set(list)] : [fallbackImage];
  }, [product]);
  const colors = useMemo(() => {
    const source = product?.colors;
    if (Array.isArray(source)) return source.map(c => typeof c === 'string' ? { name: c, hex: swatches[c.toLowerCase()] || '#a3a3a3' } : c).filter(c => c?.name);
    if (typeof source === 'string') return source.split(/[,;\\n]/).map(s => s.trim()).filter(Boolean).map(name => ({ name, hex: swatches[name.toLowerCase()] || '#a3a3a3' }));
    return [];
  }, [product]);
  useEffect(() => { if (colors.length && !selectedColor) setSelectedColor(colors[0].name); }, [colors, selectedColor]);

  useEffect(() => {
    if (!product?.name) return undefined;

    const title = `${product.name} — купить в ArzonMarket`;
    const description = String(product.description || `${product.name} — цена, характеристики и фото в ArzonMarket.`)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);

    document.title = title;
    const descriptionTag = document.head.querySelector('meta[name="description"]');
    const socialTitle = document.head.querySelector('meta[property="og:title"]');
    const socialDescription = document.head.querySelector('meta[property="og:description"]');
    if (descriptionTag) descriptionTag.content = description;
    if (socialTitle) socialTitle.content = title;
    if (socialDescription) socialDescription.content = description;

    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description,
      image: images.filter((image) => image !== fallbackImage),
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      category: product.category || undefined,
      offers: {
        '@type': 'Offer',
        url: `https://arzonmarket-omega.vercel.app/product/${encodeURIComponent(product._id || id)}`,
        priceCurrency: 'RUB',
        price: Number(product.price),
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: 'ArzonMarket' },
      },
    };

    let script = document.getElementById('product-jsonld');
    if (!script) {
      script = document.createElement('script');
      script.id = 'product-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);

    return () => {
      document.getElementById('product-jsonld')?.remove();
    };
  }, [product, images, id]);

  if (error) return <main className="container-shell py-16"><div className="empty-state"><p>{error}</p><p className="mt-4"><Link to="/catalog" className="text-accent underline">Вернуться в каталог</Link></p></div></main>;
  if (!product) return <main className="container-shell py-16 text-slate-400"><div className="skeleton h-80 w-full max-w-2xl" /><p className="mt-5">Загружаем товар…</p></main>;

  const addToCart = () => {
    add({ ...product, selectedColor: selectedColor || undefined, quantityToAdd: quantity });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };
  const changeImage = direction => setActiveImage(index => (index + direction + images.length) % images.length);

  return <main className="container-shell pb-16 pt-6 sm:pt-8">
    <Link to="/catalog" className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:border-accent/40 hover:text-accent"><ArrowLeft size={16}/> Каталог</Link>
    <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,.95fr)] lg:gap-12">
      <section className="min-w-0">
        <div className="product-gallery relative overflow-hidden rounded-[28px] border border-white/10 bg-[#f5f6f8] p-3 sm:p-6">
          {product.oldPrice > product.price && <span className="absolute left-5 top-5 z-10 rounded-full bg-[#b7f36b] px-3 py-1.5 text-xs font-black text-[#10140b]">−{Math.round((1-product.price/product.oldPrice)*100)}%</span>}
          <div className="grid min-h-[320px] place-items-center sm:min-h-[480px]">
            <img key={images[activeImage]} className="max-h-[540px] w-full object-contain transition-opacity duration-300" src={images[activeImage] || fallbackImage} alt={product.name} onError={e => { e.currentTarget.src = fallbackImage; }} />
          </div>
          {images.length > 1 && <>
            <button type="button" onClick={() => changeImage(-1)} aria-label="Предыдущее фото" className="absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-black/5 bg-white/90 text-slate-800 shadow-md transition hover:scale-105"><ChevronLeft size={20}/></button>
            <button type="button" onClick={() => changeImage(1)} aria-label="Следующее фото" className="absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-black/5 bg-white/90 text-slate-800 shadow-md transition hover:scale-105"><ChevronRight size={20}/></button>
            <span className="absolute bottom-4 right-4 rounded-full bg-black/65 px-3 py-1.5 text-xs font-semibold text-white">{activeImage + 1} / {images.length}</span>
          </>}
        </div>
        {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-2">{images.map((src, index) => <button key={src} type="button" onClick={() => setActiveImage(index)} aria-label={'Фото ' + (index+1)} className={'h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-[#f5f6f8] p-1 transition sm:h-24 sm:w-24 ' + (index === activeImage ? 'border-[#b7f36b] shadow-[0_0_0_3px_rgba(183,243,107,.12)]' : 'border-transparent opacity-70 hover:opacity-100')}><img src={src} alt="" className="h-full w-full object-contain" onError={e => { e.currentTarget.src = fallbackImage; }}/></button>)}</div>}
        {images.length > 1 && <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Images size={14}/> Фотографии товара · листайте, чтобы рассмотреть детали</p>}
      </section>

      <section className="product-detail-panel min-w-0 lg:sticky lg:top-24">
        <p className="eyebrow">{product.brand || 'ArzonMarket'} <span className="text-slate-600">/</span> {product.category || 'Каталог'}</p>
        <h1 className="mt-3 text-[clamp(26px,4vw,40px)] font-black leading-[1.12] tracking-[-.04em] text-white">{product.name}</h1>
        <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-1"><span className="text-3xl font-black tracking-tight text-accent">{money(product.price)} <span className="text-base font-bold">₽</span></span>{product.oldPrice > product.price && <span className="mb-1 text-sm text-slate-500 line-through">{money(product.oldPrice)} ₽</span>}{product.oldPrice > product.price && <span className="mb-1 rounded-md bg-rose-500/10 px-2 py-1 text-xs font-bold text-rose-300">Выгода {money(product.oldPrice-product.price)} ₽</span>}</div>
        <div className="my-6 h-px bg-white/10"/>
        {colors.length > 0 && <div className="mb-6"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-white">Цвет</h2><span className="text-sm text-slate-400">{selectedColor}</span></div><div className="mt-3 flex flex-wrap gap-3">{colors.map(color => <button key={color.name} type="button" onClick={() => setSelectedColor(color.name)} title={color.name} aria-label={'Выбрать цвет ' + color.name} className={'group flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition ' + (selectedColor === color.name ? 'border-accent bg-accent/10 text-white' : 'border-white/10 text-slate-300 hover:border-white/30')}><span className="grid h-5 w-5 place-items-center rounded-full border border-black/20 shadow-sm" style={{background: color.hex || swatches[color.name.toLowerCase()] || '#a3a3a3'}}>{selectedColor === color.name && <Check size={12} color={['#f8fafc','#9ca3af'].includes(color.hex) ? '#111827' : '#fff'}/>}</span>{color.name}</button>)}</div></div>}
        <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Количество</p>
          <div className="mt-3 flex items-center justify-between gap-4"><div className="flex items-center gap-1 rounded-xl border border-white/10 p-1"><button type="button" onClick={() => setQuantity(q => Math.max(1,q-1))} aria-label="Уменьшить количество" className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10">−</button><span className="min-w-9 text-center font-bold text-white">{quantity}</span><button type="button" onClick={() => setQuantity(q => Math.min(99,q+1))} aria-label="Увеличить количество" className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/10">+</button></div><span className="text-sm text-slate-400">Сумма: <b className="text-white">{money(product.price * quantity)} ₽</b></span></div>
          <button type="button" className="btn-primary mt-4 w-full !rounded-xl !py-4" onClick={addToCart}><ShoppingCart size={18}/>{added ? 'Добавлено в корзину ✓' : 'Добавить в корзину'}</button>
          {added && <p className="mt-2 text-center text-sm font-medium text-accent" role="status">Товар добавлен. Можно продолжить покупки.</p>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3"><div className="flex gap-3 rounded-2xl border border-white/10 p-3"><Truck size={18} className="mt-0.5 shrink-0 text-accent"/><div><p className="text-sm font-bold text-white">Доставка</p><p className="mt-1 text-xs leading-5 text-slate-400">Уточняется при оформлении</p></div></div><div className="flex gap-3 rounded-2xl border border-white/10 p-3"><RotateCcw size={18} className="mt-0.5 shrink-0 text-accent"/><div><p className="text-sm font-bold text-white">Помощь</p><p className="mt-1 text-xs leading-5 text-slate-400">Поддержка при выборе товара</p></div></div></div>
        <div className="mt-7"><h2 className="text-lg font-extrabold tracking-tight text-white">Описание товара</h2><div className="mt-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:p-5"><p className="whitespace-pre-line text-sm leading-7 text-slate-300">{product.description || 'Подробное описание товара скоро появится.'}</p></div></div>
        {Array.isArray(product.specs) && product.specs.length > 0 && <div className="mt-7"><h2 className="text-lg font-extrabold tracking-tight text-white">Характеристики</h2><div className="mt-3 overflow-hidden rounded-2xl border border-white/10">{product.specs.map((spec,i)=><div key={i} className={'flex items-start justify-between gap-5 px-4 py-3 text-sm ' + (i%2===0?'bg-white/[.025]':'')}><span className="text-slate-400">{spec.key}</span><span className="text-right font-semibold text-white">{spec.value}</span></div>)}</div></div>}
        <div className="mt-5 flex items-center gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={16} className="shrink-0 text-accent"/> Помогаем с выбором и сопровождаем заказ на каждом этапе.</div>
      </section>
    </div>
  </main>;
}
