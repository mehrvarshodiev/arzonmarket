import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Heart, Images, ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

const money = n => new Intl.NumberFormat('ru-RU').format(n || 0);
const placeholder = 'https://placehold.co/600x600/f4f5f7/8a95a5?text=ArzonMarket';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);
  const images = Array.isArray(product.images) ? [...new Set(product.images.filter(x => typeof x === 'string' && x.trim()))] : [];
  const gallery = images.length ? images : [placeholder];
  const image = gallery[Math.min(activeImage, gallery.length - 1)];
  const discount = product.oldPrice > product.price ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  const addToCart = event => {
    event.preventDefault();
    event.stopPropagation();
    add(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  const changeImage = (event, delta) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveImage(index => (index + delta + gallery.length) % gallery.length);
  };

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-white/[.07] bg-[#151922] p-2.5 shadow-[0_8px_30px_rgba(0,0,0,.12)] transition duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_18px_45px_rgba(0,0,0,.25)] sm:rounded-[26px] sm:p-3">
      <div className="relative">
        <Link to={`/product/${product._id}`} aria-label={`Открыть ${product.name}`} className="relative block aspect-[.88] overflow-hidden rounded-[17px] bg-[#f4f5f7] sm:aspect-square sm:rounded-[20px]">
          <img key={image} src={image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-3 transition duration-500 group-hover:scale-[1.035] sm:p-5" onError={e => { e.currentTarget.src = placeholder; }} />
          {discount > 0 && <span className="absolute left-2.5 top-2.5 rounded-lg bg-[#ff4778] px-2 py-1 text-[10px] font-black tracking-wide text-white shadow-sm sm:left-3 sm:top-3 sm:text-xs">−{discount}%</span>}
          {product.featured && <span className="absolute bottom-2.5 left-2.5 rounded-lg bg-[#b7f36b] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#14180e] sm:bottom-3 sm:left-3 sm:text-[10px]">Хит</span>}
          {gallery.length > 1 && <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm sm:bottom-3 sm:right-3 sm:text-xs"><Images size={12}/>{gallery.length}</span>}
        </Link>
        {gallery.length > 1 && <>
          <button type="button" onClick={e => changeImage(e, -1)} aria-label="Предыдущее фото" className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-slate-800 opacity-0 shadow-md transition hover:scale-105 group-hover:opacity-100 focus:opacity-100 sm:left-3 sm:h-8 sm:w-8"><ArrowLeft size={15}/></button>
          <button type="button" onClick={e => changeImage(e, 1)} aria-label="Следующее фото" className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-slate-800 opacity-0 shadow-md transition hover:scale-105 group-hover:opacity-100 focus:opacity-100 sm:right-3 sm:h-8 sm:w-8"><ArrowRight size={15}/></button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/20 px-1.5 py-1 backdrop-blur-sm">{gallery.slice(0, 6).map((src, i) => <span key={src + i} className={`h-1 rounded-full transition-all ${i === activeImage ? 'w-3 bg-white' : 'w-1 bg-white/60'}`} />)}</div>
        </>}
      </div>

      <div className="flex flex-1 flex-col px-1 pb-1 pt-3 sm:px-1.5 sm:pt-4">
        <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-[10px] font-extrabold uppercase tracking-[.12em] text-accent sm:text-[11px]">{product.brand || 'ArzonMarket'}</span>
          {gallery.length > 1 && <span className="shrink-0 text-[10px] text-slate-500">{activeImage + 1}/{gallery.length}</span>}
        </div>
        <Link to={`/product/${product._id}`} className="line-clamp-2 min-h-[2.7rem] text-[13px] font-semibold leading-[1.35rem] text-slate-100 transition hover:text-accent sm:min-h-[3rem] sm:text-sm sm:leading-6">{product.name}</Link>
        {Array.isArray(product.colors) && product.colors.length > 0 && <div className="mt-2 flex items-center gap-1.5"><span className="flex -space-x-1">{product.colors.slice(0, 4).map((c, i) => <span key={typeof c === 'string' ? c : c.name || i} className="h-3 w-3 rounded-full border border-[#151922] bg-slate-400" style={{ backgroundColor: typeof c === 'object' ? c.hex : undefined }} />)}</span><span className="truncate text-[10px] text-slate-500 sm:text-xs">{product.colors.length} цвета</span></div>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3 sm:pt-4">
          <div className="min-w-0">
            <div className="whitespace-nowrap text-[15px] font-black tracking-tight text-white sm:text-lg">{money(product.price)} <span className="text-[10px] font-semibold text-slate-400 sm:text-xs">сум</span></div>
            {discount > 0 && <div className="mt-0.5 whitespace-nowrap text-[10px] text-slate-500 line-through sm:text-xs">{money(product.oldPrice)} сум</div>}
          </div>
          <button type="button" onClick={addToCart} aria-label="Добавить в корзину" className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition duration-200 sm:h-10 sm:w-10 ${added ? 'bg-[#b7f36b] text-[#12160c]' : 'bg-accent text-ink hover:scale-105 hover:shadow-[0_6px_20px_rgba(183,243,107,.2)]'}`}>{added ? <Check size={17}/> : <ShoppingCart size={17}/>}</button>
        </div>
        {added && <p role="status" className="mt-2 text-[11px] font-semibold text-accent">Добавлено в корзину</p>}
      </div>
    </article>
  );
}
