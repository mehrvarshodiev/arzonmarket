import { useEffect,useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../api';
import ProductCard from '../components/ProductCard';
export default function Catalog(){
 const [params,setParams]=useSearchParams(); const [type,setType]=useState(params.get('type')||''); const [q,setQ]=useState(''); const [sort,setSort]=useState('newest'); const [products,setProducts]=useState([]); const [error,setError]=useState('');
 useEffect(()=>{setType(params.get('type')||'');},[params]);
 useEffect(()=>{let live=true;const p=new URLSearchParams();if(type)p.set('type',type);if(q)p.set('q',q);if(sort)p.set('sort',sort);api.get('/products?'+p).then(r=>live&&setProducts(r.data)).catch(()=>live&&setError('Не удалось загрузить товары.')).finally(()=>{});return()=>{live=false};},[type,q,sort]);
 return <main className="container-shell min-h-[70vh] pb-12 pt-8 md:pt-12"><p className="eyebrow">НАЙДИ СВОЁ УСТРОЙСТВО</p><h1 className="page-title mb-7">Каталог<span className="text-accent">.</span></h1><div className="mb-6 grid gap-3 sm:grid-cols-[1fr_220px]"><label className="search-box"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Поиск по названию или бренду..."/></label><select className="field" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Сначала новые</option><option value="cheap">Сначала дешевле</option><option value="expensive">Сначала дороже</option></select></div><div className="mb-6 flex flex-wrap gap-2">{[['','Все товары'],['Телефоны','Смартфоны'],['Аксессуары','Аксессуары']].map(([v,label])=><button key={v} onClick={()=>{setType(v);setParams(v?{type:v}:{})}} className={`rounded-xl border px-4 py-2 text-sm ${type===v?'border-accent bg-accent text-ink':'border-white/10 text-slate-300'}`}>{label}</button>)}</div>{error?<div className="empty-state">{error}</div>:products.length?<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.map(p=><ProductCard key={p._id} product={p}/>)}</div>:<div className="empty-state">Товары не найдены. Проверьте подключение к базе или сбросьте фильтры.</div>}</main>;
}
