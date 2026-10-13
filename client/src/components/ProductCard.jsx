import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

const money = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(n) || 0);
const placeholder = 'https://placehold.co/600x600/f4f5f7/8a95a5?text=ArzonMarket';

export default function ProductCard({ product }) {
  const { items = [], add, setQuantity } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(null);
  const [touchStart, setTouchStart] = useState(null);

  // Keep the existing product shape, while accepting gallery/color variants when present.
  const colors = Array.isArray(product.colors) && product.colors.length
    ? product.colors
    : (Array.isArray(product.specs) ? product.specs.filter(spec => spec && (spec.key === 'Цвет' || spec.key === 'Color')).map(spec => spec.value).filter(Boolean) : []);
  const images = useMemo(() => {
    const source = selectedColor && typeof selectedColor === 'object'
      ? [...(Array.isArray(selectedColor.images) ? selectedColor.images : []), selectedColor.image].filter(Boolean)
      : [];
    const base = Array.isArray(product.images) ? product.images : [];
    const legacyImage = [product.image, product.image_url, product.imageUrl, product.photo].filter(Boolean);
    return [...new Set([...source, ...base, ...legacyImage].filter(x => typeof x === 'string' && x.trim()))];
  }, [product.images, selectedColor]);
  const gallery = images.length ? images : [placeholder];
  const currentImage = gallery[Math.min(activeImage, gallery.length - 1)];
  const price = selectedColor && typeof selectedColor === 'object' && selectedColor.price != null
    ? Number(selectedColor.price) : Number(product.price) || 0;
  const oldPrice = selectedColor && typeof selectedColor === 'object' && selectedColor.oldPrice != null
    ? Number(selectedColor.oldPrice) : Number(product.oldPrice) || 0;
  const discount = oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
  const cartKey = product._id + '::' + (selectedColor ? (typeof selectedColor === 'string' ? selectedColor : selectedColor.name || '') : '');
  const cartItem = items.find(item => (item._cartKey || item._id) === cartKey ||
    (!selectedColor && !item.selectedColor && item._id === product._id));
  const quantity = cartItem?.quantity || 0;

  const stepImage = delta => setActiveImage(index => (index + delta + gallery.length) % gallery.length);
  const handleHover = event => {
    if (gallery.length < 2 || window.matchMedia('(hover: none)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.min(gallery.length - 1, Math.floor(ratio * gallery.length));
    setActiveImage(index);
  };
  const addOne = event => {
    event.preventDefault();
    event.stopPropagation();
    add({ ...product, price, oldPrice, images: gallery, selectedColor: selectedColor ? (typeof selectedColor === 'string' ? selectedColor : selectedColor.name || '') : '' });
  };
  const adjust = (event, delta) => {
    event.preventDefault();
    event.stopPropagation();
    if (quantity === 0 && delta > 0) addOne(event);
    else if (cartItem) setQuantity(cartItem._cartKey || cartItem._id, quantity + delta);
  };
  const swipeEnd = event => {
    if (touchStart == null) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 35) stepImage(distance < 0 ? 1 : -1);
    setTouchStart(null);
  };

  return (
    <article className="product-card group relative flex min-w-0 flex-col rounded-[18px] p-2 shadow-[0_2px_12px_rgba(15,23,42,.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(15,23,42,.13)] sm:rounded-[22px] sm:p-3">
      <div className="relative">
        <Link to={`/product/${product._id}`} aria-label={`Открыть ${product.name}`}
          onMouseMove={handleHover}
          onTouchStart={event => setTouchStart(event.touches[0].clientX)}
          onTouchEnd={swipeEnd}
          className="relative block aspect-[.82] overflow-hidden rounded-[16px] bg-gradient-to-br from-[#f8fafc] via-[#f1f4f8] to-[#e9eef4] sm:aspect-[.9] sm:rounded-[20px]">
          <img key={currentImage} src={currentImage} alt={product.name} loading="lazy"
            className="absolute inset-0 h-full w-full select-none rounded-[inherit] object-cover p-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            onError={event => { event.currentTarget.src = placeholder; }} />
          {discount > 0 && <span className="absolute bottom-2 left-2 rounded-md bg-[#e83d78] px-2 py-1 text-[10px] font-extrabold text-white sm:bottom-3 sm:left-3 sm:text-xs">−{discount}%</span>}
          {product.featured && <span className="absolute left-2 top-2 rounded-md bg-[#6d28d9] px-2 py-1 text-[9px] font-bold text-white sm:left-3 sm:top-3 sm:text-[10px]">ХИТ</span>}
          {gallery.length > 1 && <div className="absolute bottom-2 left-1/2 flex max-w-[60%] -translate-x-1/2 gap-1">{gallery.slice(0, 7).map((src, i) =>
            <span key={src + i} className={`h-1 rounded-full transition-all ${i === activeImage ? 'w-4 bg-[#84cc16]' : 'w-2 bg-slate-300/90'}`} />)}</div>}
        </Link>
        {gallery.length > 1 && <span className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-white/90 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 sm:right-3 sm:bottom-3">{activeImage + 1}/{gallery.length}</span>}
      </div>

      <div className="flex flex-1 flex-col px-0.5 pb-0.5 pt-1.5 sm:px-1 sm:pt-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-extrabold leading-tight tracking-tight text-accent sm:text-lg">{money(price)} <span className="text-[10px] font-bold">₽</span></span>
          {discount > 0 && <span className="truncate text-[10px] text-slate-400 line-through sm:text-xs">{money(oldPrice)} ₽</span>}
        </div>
        <span className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:text-[11px]">{product.brand || 'ArzonMarket'}</span>
        <Link to={`/product/${product._id}`} className="product-card-title mt-0.5 line-clamp-2 min-h-[2.25rem] text-[12px] leading-[1.125rem] sm:min-h-[2.75rem] sm:text-sm sm:leading-5">{product.name}</Link>


        {colors.length > 0 && <div className="mt-1.5 flex min-h-5 items-center gap-1.5" aria-label="Выбор цвета">
          {colors.slice(0, 6).map((color, index) => {
            const name = typeof color === 'string' ? color : color.name || `Цвет ${index + 1}`;
            const hex = typeof color === 'object' ? color.hex || color.color : (typeof color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : undefined);
            const selected = selectedColor === color;
            return <button key={name + index} type="button" title={name} aria-label={name} onClick={() => { setSelectedColor(color); setActiveImage(0); }}
              className={`h-4 w-4 rounded-full border-2 transition hover:scale-110 sm:h-[18px] sm:w-[18px] ${selected ? 'border-[#7c3aed] ring-1 ring-[#7c3aed]/30' : 'border-white shadow-[0_0_0_1px_#d1d5db]'}`}
              style={{ backgroundColor: hex || (typeof color === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#d1d5db') }} />;
          })}
          <span className="ml-0.5 truncate text-[9px] text-slate-500 sm:text-[10px]">{selectedColor ? (typeof selectedColor === 'string' ? selectedColor : selectedColor.name || 'Выбран цвет') : `${colors.length} цвета`}</span>
        </div>}

        <div className="mt-auto pt-1.5">
          {quantity > 0 ? <div className="flex h-9 items-center justify-between rounded-xl bg-accent/15 p-1 text-accent sm:h-10">
            <button type="button" onClick={event => adjust(event, -1)} aria-label="Уменьшить количество" className="grid h-7 w-8 place-items-center rounded-lg bg-panel hover:bg-accent/10 sm:h-8"><Minus size={15}/></button>
            <span className="text-sm font-extrabold tabular-nums">{quantity}</span>
            <button type="button" onClick={event => adjust(event, 1)} aria-label="Увеличить количество" className="grid h-7 w-8 place-items-center rounded-lg bg-white hover:bg-purple-50 sm:h-8"><Plus size={15}/></button>
          </div> : <button type="button" onClick={addOne} className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-accent text-xs font-extrabold text-[#10140b] transition hover:bg-[#c8ff86] active:scale-[.98] sm:h-10 sm:text-sm">
            <ShoppingCart size={15}/> В корзину
          </button>}
        </div>
      </div>
    </article>
  );
}
