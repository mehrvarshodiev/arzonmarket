import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Smartphone, UserRound, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const countries = [{"iso":"AE","name":"ОАЭ","dial":"+971","length":9},{"iso":"AF","name":"Афганистан","dial":"+93","length":9},{"iso":"AM","name":"Армения","dial":"+374","length":8},{"iso":"AU","name":"Австралия","dial":"+61","length":9},{"iso":"AZ","name":"Азербайджан","dial":"+994","length":9},{"iso":"BD","name":"Бангладеш","dial":"+880","length":10},{"iso":"BR","name":"Бразилия","dial":"+55","length":11},{"iso":"BY","name":"Беларусь","dial":"+375","length":9},{"iso":"CA","name":"Канада","dial":"+1","length":10},{"iso":"CH","name":"Швейцария","dial":"+41","length":9},{"iso":"CN","name":"Китай","dial":"+86","length":11},{"iso":"CZ","name":"Чехия","dial":"+420","length":9},{"iso":"DE","name":"Германия","dial":"+49","length":10},{"iso":"EG","name":"Египет","dial":"+20","length":10},{"iso":"ES","name":"Испания","dial":"+34","length":9},{"iso":"FR","name":"Франция","dial":"+33","length":9},{"iso":"GB","name":"Великобритания","dial":"+44","length":10},{"iso":"GE","name":"Грузия","dial":"+995","length":9},{"iso":"ID","name":"Индонезия","dial":"+62","length":10},{"iso":"IN","name":"Индия","dial":"+91","length":10},{"iso":"IR","name":"Иран","dial":"+98","length":10},{"iso":"IT","name":"Италия","dial":"+39","length":10},{"iso":"JP","name":"Япония","dial":"+81","length":10},{"iso":"KG","name":"Кыргызстан","dial":"+996","length":9},{"iso":"KR","name":"Южная Корея","dial":"+82","length":10},{"iso":"KZ","name":"Казахстан","dial":"+7","length":10},{"iso":"MY","name":"Малайзия","dial":"+60","length":9},{"iso":"NG","name":"Нигерия","dial":"+234","length":10},{"iso":"NL","name":"Нидерланды","dial":"+31","length":9},{"iso":"NO","name":"Норвегия","dial":"+47","length":8},{"iso":"PK","name":"Пакистан","dial":"+92","length":10},{"iso":"PL","name":"Польша","dial":"+48","length":9},{"iso":"RO","name":"Румыния","dial":"+40","length":9},{"iso":"RU","name":"Россия","dial":"+7","length":10},{"iso":"SA","name":"Саудовская Аравия","dial":"+966","length":9},{"iso":"SE","name":"Швеция","dial":"+46","length":8},{"iso":"TH","name":"Таиланд","dial":"+66","length":9},{"iso":"TJ","name":"Таджикистан","dial":"+992","length":9},{"iso":"TR","name":"Турция","dial":"+90","length":10},{"iso":"UA","name":"Украина","dial":"+380","length":9},{"iso":"US","name":"США","dial":"+1","length":10},{"iso":"UZ","name":"Узбекистан","dial":"+998","length":9},{"iso":"VN","name":"Вьетнам","dial":"+84","length":9},{"iso":"ZA","name":"ЮАР","dial":"+27","length":9}];
const namePattern = /^[\p{L}][\p{L}\p{M} .'-]*$/u;
function validateName(value) {
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2) return 'Введите имя минимум из 2 символов.';
  if (name.length > 60) return 'Имя не должно превышать 60 символов.';
  if (!namePattern.test(name)) return 'Используйте буквы, пробелы, дефис или апостроф.';
  return '';
}
export default function Login() {
  const {user,isAuthenticated,requestCode,verifyCode,logout}=useAuth();
  const [name,setName]=useState(''); const [countryIso,setCountryIso]=useState('TJ'); const [localPhone,setLocalPhone]=useState('');
  const [code,setCode]=useState(''); const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [touched,setTouched]=useState({name:false,phone:false}); const nav=useNavigate(); const location=useLocation();
  const country=countries.find(c=>c.iso===countryIso)||countries[0];
  const normalizedName=name.trim().replace(/\s+/g,' ');
  const countryCodeDigits=country.dial.replace(/\D/g,'');
  const phoneDigits=localPhone.replace(/\D/g,'').replace(/^0+/,'');
  const fullPhone=country.dial+phoneDigits;
  const internationalDigits=fullPhone.replace(/\D/g,'');
  const nameError=validateName(name);
  // ITU-T E.164: international number contains no more than 15 digits.
  // The country-specific national length is not fixed by E.164 itself.
  const phoneError=internationalDigits.length<8
    ? 'Введите полный номер телефона.'
    : internationalDigits.length>15
      ? 'По стандарту ITU-T E.164 номер не должен превышать 15 цифр вместе с кодом страны.'
      : !/^\+[1-9]\d{7,14}$/.test(fullPhone)
        ? 'Проверьте международный формат номера телефона.'
        : '';
  const phoneValid=!phoneError;
  const submit=async e=>{e.preventDefault();setError('');setTouched({name:true,phone:true});
    if(!sent && (nameError||!phoneValid)){setError(nameError||phoneError||'Проверьте введённые данные.');return;}
    setBusy(true);try{if(!sent){await requestCode(fullPhone);setSent(true);}else{await verifyCode(fullPhone,code,normalizedName);nav(location.state?.from?.pathname||'/',{replace:true});}}
    catch(err){setError(err.response?.data?.message||'Не удалось выполнить вход.');}finally{setBusy(false);}
  };
  return <main className="container-shell grid min-h-[70vh] place-items-center py-12"><section className="auth-card w-full max-w-md rounded-3xl border border-white/10 bg-panel p-6 sm:p-8">
    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-ink"><Smartphone/></span>
    <h1 className="mt-5 text-3xl font-black text-white">{isAuthenticated?'Ваш профиль':'Войти в ArzonMarket'}</h1>
    {isAuthenticated?<><p className="mt-3 text-slate-400">{user?.name||user?.phone}</p>{user?.role==='admin'&&<Link to="/admin" className="btn-primary mt-5 w-full">Открыть админ-панель</Link>}<button onClick={()=>{logout();setSent(false);}} className="btn-secondary mt-4 w-full">Выйти</button></>:<form onSubmit={submit} className="mt-6 space-y-4" noValidate>
      <label className="block"><span className="field-label"><UserRound size={14}/> Ваше имя</span><input className={`field ${touched.name&&nameError?'field-invalid':''}`} type="text" autoComplete="name" placeholder="Введите ваше имя" value={name} onChange={e=>setName(e.target.value.slice(0,80))} onBlur={()=>setTouched(t=>({...t,name:true}))} required maxLength={80} disabled={sent}/>{touched.name&&nameError&&<span className="field-error">{nameError}</span>}</label>
      <div><span className="field-label"><Phone size={14}/> Номер телефона</span><div className="phone-entry mt-2">
        <select className="country-select" aria-label="Код страны" value={countryIso} onChange={e=>{setCountryIso(e.target.value);setTouched(t=>({...t,phone:false}));setError('');}} disabled={sent}>{countries.map(c=><option key={c.iso} value={c.iso}>{c.iso} ({c.dial})</option>)}</select>
        <input className={`field phone-number ${touched.phone&&phoneError?'field-invalid':''}`} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="Введите номер телефона" value={localPhone} onChange={e=>setLocalPhone(e.target.value.replace(/\D/g,'').slice(0,15-countryCodeDigits.length))} onBlur={()=>setTouched(t=>({...t,phone:true}))} required disabled={sent} aria-label="Номер телефона без кода страны"/>
      </div><p className="mt-2 text-xs text-slate-500">Код страны: <strong>{country.dial}</strong>. Введите национальную часть номера без кода страны. По ITU-T E.164 международный номер содержит не более 15 цифр.</p>{touched.phone&&phoneError&&<span className="field-error">{phoneError}</span>}</div>
      {sent&&<label className="block"><span className="field-label">Код подтверждения</span><input className="field text-center text-xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,4))} required/><p className="mt-2 text-xs text-slate-500">Демо: код выводится в консоль сервера.</p></label>}
      {error&&<p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-600">{error}</p>}
      <button disabled={busy||(sent&&code.length!==4)} className="btn-primary w-full">{busy?'Подождите...':sent?'Подтвердить и создать профиль':'Получить код подтверждения'}</button>
      {sent&&<button type="button" onClick={()=>{setSent(false);setCode('');setError('');}} className="w-full text-sm text-slate-400">Изменить данные</button>}
      <p className="text-xs leading-relaxed text-slate-500">Имя: от 2 до 60 символов. Номер проверяется по выбранному коду страны.</p>
    </form>}
  </section></main>;
}
