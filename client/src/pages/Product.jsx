import { useEffect,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { ArrowLeft,ShoppingCart,ShieldCheck } from 'lucide-react';
import api from '../api';
import { useCart } from '../context/CartContext';
const money=n=>new Intl.NumberFormat('ru-RU').format(n||0);
export default function Product(){
 const {id}=useParams();const [product,setProduct]=useState(null);const [error,setError]=useState('');const {add}=useCart();
 useEffect(()=>{api.get('/products/'+id).then(r=>setProduct(r.data)).catch(()=>setError('Товар не найден или сервер недоступен.'));},[id]);
 if(error)return <main className="container-shell py-16"><div className="empty-state">{error}<p className="mt-4"><Link to="/catalog" className="text-accent">Вернуться в каталог</Link></p></div></main>;
 if(!product)return <main className="container-shell py-16 text-slate-400">Загружаем товар...</main>;
 return <main className="container-shell pb-14 pt-8"><Link to="/catalog" className="mb-7 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent"><ArrowLeft size={16}/> Назад в каталог</Link><div className="grid gap-8 md:grid-cols-2"><div className="grid min-h-80 place-items-center rounded-3xl border border-white/10 bg-panel p-6"><img className="max-h-[480px] w-full object-contain" src={product.images?.[0]||'https://placehold.co/600x450/171c27/b7f36b?text=ArzonMarket'} alt={product.name}/></div><div className="py-3"><p className="eyebrow">{product.brand} · {product.category}</p><h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{product.name}</h1><p className="mt-5 text-2xl font-extrabold text-accent">{money(product.price)} сум</p>{product.oldPrice>product.price&&<p className="mt-1 text-sm text-slate-500 line-through">{money(product.oldPrice)} сум</p>}<p className="mt-6 leading-7 text-slate-300">{product.description||'Описание товара скоро появится.'}</p><button className="btn-primary mt-7 w-full sm:w-auto" onClick={()=>add(product)}><ShoppingCart size={18}/> Добавить в корзину</button><div className="mt-6 flex items-center gap-3 text-sm text-slate-400"><ShieldCheck className="text-accent"/> Поддержка и помощь с выбором</div>{product.specs?.length>0&&<div className="mt-8"><h2 className="mb-3 font-bold text-white">Характеристики</h2>{product.specs.map((s,i)=><div key={i} className="flex justify-between border-b border-white/10 py-3 text-sm"><span className="text-slate-400">{s.key}</span><span className="text-white">{s.value}</span></div>)}</div>}</div></div></main>;
}
