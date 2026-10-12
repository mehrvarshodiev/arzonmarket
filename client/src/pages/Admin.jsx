import { useEffect,useState } from 'react';
import { Plus,Trash2,ImagePlus,X } from 'lucide-react';
import api from '../api';
const blank={name:'',description:'',price:'',category:'Телефоны',brand:'',images:[''],colors:'',featured:false,stock:0};
const money=n=>new Intl.NumberFormat('ru-RU').format(n||0);
export default function Admin(){
 const [products,setProducts]=useState([]);const [form,setForm]=useState(blank);const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const load=()=>api.get('/products?sort=newest').then(r=>setProducts(r.data)).catch(()=>setError('Не удалось загрузить товары.'));
 useEffect(()=>{load();},[]);
 const update=(k,v)=>setForm(f=>({...f,[k]:v}));
 const updateImage=(index,value)=>setForm(f=>({...f,images:f.images.map((img,i)=>i===index?value:img)}));
 const addImage=()=>setForm(f=>({...f,images:[...f.images,'']}));
 const removeImage=index=>setForm(f=>({...f,images:f.images.filter((_,i)=>i!==index)}));
 const submit=async e=>{e.preventDefault();setError('');setNotice('');try{
   const colors=form.colors.split(/[,;\\n]/).map(s=>s.trim()).filter(Boolean);
   await api.post('/products',{...form,price:Number(form.price),stock:Number(form.stock)||0,images:form.images.map(s=>s.trim()).filter(Boolean),colors});
   setNotice('Товар добавлен. Если в вашей базе ещё нет поля цветов, сохраните сначала фото, а поддержку цветов добавьте после обновления схемы.');setForm({...blank,images:['']});load();
 }catch(err){setError(err.response?.data?.message||'Не удалось сохранить. Убедитесь, что у пользователя роль admin.');}};
 const remove=async id=>{if(!window.confirm('Удалить этот товар?'))return;try{await api.delete('/products/'+id);setProducts(p=>p.filter(x=>x._id!==id));}catch(err){setError(err.response?.data?.message||'Не удалось удалить товар.');}};
 return <main className="container-shell pb-14 pt-8"><p className="eyebrow">УПРАВЛЕНИЕ МАГАЗИНОМ</p><h1 className="page-title mb-3">Админ-панель<span className="text-accent">.</span></h1><p className="mb-8 max-w-2xl text-sm leading-6 text-slate-400">Добавляйте несколько фотографий для одного товара — они появятся в галерее на странице товара. Цвета вводите через запятую, например: Чёрный, Белый, Синий.</p>
 <form onSubmit={submit} className="mb-10 grid gap-4 rounded-3xl border border-white/10 bg-panel p-5 sm:grid-cols-2">
 <label className="block sm:col-span-2"><span className="field-label">Название товара</span><input className="field" value={form.name} onChange={e=>update('name',e.target.value)} required/></label>
 <label className="block sm:col-span-2"><span className="field-label">Описание</span><textarea className="field min-h-28" value={form.description} onChange={e=>update('description',e.target.value)} placeholder="Опишите преимущества, материалы и особенности товара"/></label>
 <label className="block"><span className="field-label">Цена, сум</span><input className="field" type="number" min="0" value={form.price} onChange={e=>update('price',e.target.value)} required/></label>
 <label className="block"><span className="field-label">Бренд</span><input className="field" value={form.brand} onChange={e=>update('brand',e.target.value)} required/></label>
 <label className="block"><span className="field-label">Категория</span><select className="field" value={form.category} onChange={e=>update('category',e.target.value)}><option>Телефоны</option><option>Аксессуары</option></select></label>
 <label className="block"><span className="field-label">Остаток</span><input className="field" type="number" min="0" value={form.stock} onChange={e=>update('stock',e.target.value)}/></label>
 <div className="sm:col-span-2"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><span className="field-label !mb-1">Фотографии товара</span><p className="text-xs text-slate-500">Добавьте URL главного фото и дополнительные ракурсы.</p></div><button type="button" className="btn-secondary !py-2" onClick={addImage}><ImagePlus size={16}/> Добавить фото</button></div><div className="space-y-3">{form.images.map((image,index)=><div key={index} className="flex items-center gap-2"><div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/5">{image?<img src={image} alt="" className="h-full w-full object-contain" onError={e=>{e.currentTarget.style.display='none'}}/>:<ImagePlus size={16} className="text-slate-500"/>}</div><input className="field" type="url" value={image} onChange={e=>updateImage(index,e.target.value)} placeholder={index===0?'URL главного фото':'URL дополнительного фото'}/>{form.images.length>1&&<button type="button" className="icon-btn !h-10 !w-10 shrink-0 text-red-300" onClick={()=>removeImage(index)} aria-label="Удалить фото"><X size={16}/></button>}</div>)}</div></div>
 <label className="block sm:col-span-2"><span className="field-label">Доступные цвета</span><input className="field" value={form.colors} onChange={e=>update('colors',e.target.value)} placeholder="Чёрный, Белый, Синий"/><p className="mt-2 text-xs leading-5 text-slate-500">Названия цветов через запятую. Для сохранения цветов в базе данных должна быть настроена поддержка поля colors.</p></label>
 {error&&<p className="text-sm text-red-300 sm:col-span-2">{error}</p>}{notice&&<p className="text-sm text-accent sm:col-span-2">{notice}</p>}<button className="btn-primary sm:col-span-2"><Plus size={17}/> Добавить товар</button></form>
 <h2 className="mb-4 text-xl font-bold text-white">Товары ({products.length})</h2><div className="space-y-3">{products.map(p=><article key={p._id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-panel p-4"><img src={p.images?.[0]||'https://placehold.co/100x100'} alt="" className="h-14 w-14 rounded-xl bg-white object-contain"/><div className="min-w-0 flex-1"><p className="font-bold text-white">{p.name}</p><p className="text-sm text-slate-400">{p.brand} · {money(p.price)} сум · {p.images?.length||0} фото</p></div><button className="icon-btn !text-red-300" onClick={()=>remove(p._id)} aria-label="Удалить товар"><Trash2 size={16}/></button></article>)}</div></main>;
}
