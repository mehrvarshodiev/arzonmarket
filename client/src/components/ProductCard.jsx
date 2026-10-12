import { Link } from 'react-router-dom';
import { ArrowUpRight, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
const money = n => new Intl.NumberFormat('ru-RU').format(n);
export default function ProductCard({ product }) {
  const { add } = useCart();
  const image = product.images?.[0] || 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80';
  return <article className="product-card group">
    <Link to={`/product/${product._id}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-[#f4f5f7]">
      <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2 transition duration-500 group-hover:scale-[1.04]" onError={e=>{e.currentTarget.src='https://placehold.co/600x600/f4f5f7/8a95a5?text=ArzonMarket'}}/>
      {product.oldPrice > product.price && <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-extrabold text-ink">-{Math.round((1-product.price/product.oldPrice)*100)}%</span>}
      <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full border border-black/5 bg-white/90 text-slate-700 opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100"><ArrowUpRight size={18}/></span>
    </Link>
    <div className="px-1 pb-1 pt-4"><div className="mb-1 text-xs font-bold uppercase tracking-[.14em] text-accent">{product.brand}</div><Link to={`/product/${product._id}`} className="line-clamp-2 min-h-12 font-semibold leading-6 text-white hover:text-accent">{product.name}</Link>
    <div className="mt-3 flex items-center justify-between gap-2"><div><div className="font-extrabold text-white">{money(product.price)} <span className="text-xs font-medium text-slate-400">сум</span></div>{product.oldPrice > product.price&&<div className="text-xs text-slate-500 line-through">{money(product.oldPrice)} сум</div>}</div><button className="icon-btn !h-10 !w-10 shrink-0 border-accent/20 text-accent hover:bg-accent hover:text-ink" onClick={()=>add(product)} aria-label="Добавить в корзину"><ShoppingCart size={17}/></button></div></div>
  </article>;
}
