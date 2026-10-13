import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Smartphone, UserRound, Phone, LoaderCircle, Send, ShoppingBag, LogOut, ShieldCheck } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import parsePhoneNumber, { getCountryCallingCode } from 'libphonenumber-js/max';

const countries = [{"iso":"AE","name":"ОАЭ"},{"iso":"AF","name":"Афганистан"},{"iso":"AM","name":"Армения"},{"iso":"AU","name":"Австралия"},{"iso":"AZ","name":"Азербайджан"},{"iso":"BD","name":"Бангладеш"},{"iso":"BR","name":"Бразилия"},{"iso":"BY","name":"Беларусь"},{"iso":"CA","name":"Канада"},{"iso":"CH","name":"Швейцария"},{"iso":"CN","name":"Китай"},{"iso":"CZ","name":"Чехия"},{"iso":"DE","name":"Германия"},{"iso":"EG","name":"Египет"},{"iso":"ES","name":"Испания"},{"iso":"FR","name":"Франция"},{"iso":"GB","name":"Великобритания"},{"iso":"GE","name":"Грузия"},{"iso":"ID","name":"Индонезия"},{"iso":"IN","name":"Индия"},{"iso":"IR","name":"Иран"},{"iso":"IT","name":"Италия"},{"iso":"JP","name":"Япония"},{"iso":"KG","name":"Кыргызстан"},{"iso":"KR","name":"Южная Корея"},{"iso":"KZ","name":"Казахстан"},{"iso":"MY","name":"Малайзия"},{"iso":"NG","name":"Нигерия"},{"iso":"NL","name":"Нидерланды"},{"iso":"NO","name":"Норвегия"},{"iso":"PK","name":"Пакистан"},{"iso":"PL","name":"Польша"},{"iso":"RO","name":"Румыния"},{"iso":"RU","name":"Россия"},{"iso":"SA","name":"Саудовская Аравия"},{"iso":"SE","name":"Швеция"},{"iso":"TH","name":"Таиланд"},{"iso":"TJ","name":"Таджикистан"},{"iso":"TR","name":"Турция"},{"iso":"UA","name":"Украина"},{"iso":"US","name":"США"},{"iso":"UZ","name":"Узбекистан"},{"iso":"VN","name":"Вьетнам"},{"iso":"ZA","name":"ЮАР"}];
const namePattern = /^[\p{L}][\p{L}\p{M} .'-]*$/u;
const countryFlag = iso => String.fromCodePoint(...Array.from(iso.toUpperCase(), char => char.charCodeAt(0) + 127397));
function validateName(value) {
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name) return 'Введите ваше имя.';
  if (name.length > 60) return 'Имя не должно превышать 60 символов.';
  if (!namePattern.test(name)) return 'Используйте буквы, пробелы, дефис или апостроф.';
  return '';
}
export default function Login() {
  const {user,isAuthenticated,requestCode,verifyCode,loginTelegram,logout}=useAuth();
  const [name,setName]=useState(''); const [countryIso,setCountryIso]=useState('TJ'); const [localPhone,setLocalPhone]=useState('');
  const [code,setCode]=useState(''); const [sent,setSent]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [touched,setTouched]=useState({name:false,phone:false}); const nav=useNavigate(); const location=useLocation();
  const telegramWidgetRef = useRef(null);
  const [telegramBotUsername, setTelegramBotUsername] = useState(import.meta.env.VITE_TELEGRAM_BOT_USERNAME || '');
  const [telegramConfigReady, setTelegramConfigReady] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/auth/telegram/config').then(({ data }) => {
      if (active && data?.username) setTelegramBotUsername(String(data.username).replace(/^@/, ''));
    }).catch(() => {}).finally(() => { if (active) setTelegramConfigReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!telegramBotUsername || isAuthenticated || !telegramWidgetRef.current) return;
    const container = telegramWidgetRef.current;
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.dataset.telegramLogin = telegramBotUsername;
    script.dataset.size = 'large';
    script.dataset.radius = '12';
    script.dataset.userpic = 'false';
    script.dataset.onauth = 'onTelegramAuth(user)';
    window.onTelegramAuth = async telegramUser => {
      setBusy(true);
      setError('');
      try {
        await loginTelegram(telegramUser);
        nav(location.state?.from?.pathname || '/', { replace: true });
      } catch (err) {
        setError(err.response?.data?.message || 'Не удалось войти через Telegram. Попробуйте ещё раз.');
      } finally {
        setBusy(false);
      }
    };
    container.appendChild(script);
    return () => {
      script.remove();
      delete window.onTelegramAuth;
    };
  }, [telegramBotUsername, isAuthenticated, loginTelegram, nav, location.state]);
  const country=countries.find(c=>c.iso===countryIso)||countries[0];
  const normalizedName=name.trim().replace(/\s+/g,' ');
  const callingCode = getCountryCallingCode(countryIso);
  // Keep the input independent from internal metadata array shapes; E.164 allows
  // at most 15 digits including the country calling code.
  const nationalMaxLength = Math.max(4, 15 - callingCode.length);
  let parsedPhone;
  try {
    parsedPhone = localPhone.trim()
      ? parsePhoneNumber(localPhone, { defaultCountry: countryIso, extract: false })
      : undefined;
  } catch {
    parsedPhone = undefined;
  }
  const fullPhone = parsedPhone?.number || '';
  const nameError=validateName(name);
  // Use libphonenumber-js/max metadata for numbering-plan validation; E.164 caps the full number at 15 digits.
  const phoneError = !localPhone.trim()
    ? 'Введите номер телефона.'
    : !parsedPhone || !parsedPhone.isPossible()
      ? 'Проверьте длину номера телефона для выбранной страны.'
      : !parsedPhone.isValid() || parsedPhone.country !== countryIso || !/^\+[1-9]\d{1,14}$/.test(fullPhone)
        ? 'Введите корректный номер телефона для выбранной страны.'
        : '';
  const phoneValid=!phoneError;
  const submit=async e=>{e.preventDefault();setError('');setTouched({name:true,phone:true});
    if(!sent && (nameError||!phoneValid)){setError(nameError||phoneError||'Проверьте введённые данные.');return;}
    setBusy(true);try{if(!sent){await requestCode(fullPhone);setSent(true);}else{await verifyCode(fullPhone,code,normalizedName);nav(location.state?.from?.pathname||'/',{replace:true});}}
    catch(err){setError(err.code==='API_NOT_CONFIGURED'?'Сервис входа ещё не подключён к серверу. Попробуйте позже.':err.code==='API_INVALID_RESPONSE'?'Сервер API настроен неправильно. Обратитесь к администратору.':err.response?.data?.message||'Не удалось выполнить вход. Проверьте подключение и попробуйте снова.');}finally{setBusy(false);}
  };
  return <main className="container-shell grid min-h-[70vh] place-items-center py-12">
    <section className="auth-card w-full max-w-md rounded-3xl border border-white/10 bg-panel p-6 sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-ink"><Smartphone/></span>
      <h1 className="mt-5 text-3xl font-black text-white">{isAuthenticated ? 'Ваш профиль' : 'Войти в ArzonMarket'}</h1>
      {isAuthenticated ? <>
        <p className="mt-3 text-slate-400">{user?.name || user?.phone || (user?.telegramId ? 'Аккаунт Telegram подключён' : 'Вы вошли в аккаунт.')}</p>
        <Link to="/catalog" className="btn-primary mt-5 w-full"><ShoppingBag size={17}/> Перейти в каталог</Link>
        <Link to="/cart" className="btn-secondary mt-3 w-full"><ShoppingBag size={17}/> Моя корзина</Link>
        {user?.role === 'admin' && <Link to="/admin" className="btn-secondary mt-3 w-full"><ShieldCheck size={17}/> Панель администратора</Link>}
        <button onClick={() => { logout(); setSent(false); setCode(''); }} className="mt-4 flex w-full items-center justify-center gap-2 py-2 text-sm text-slate-500 transition hover:text-red-300"><LogOut size={16}/> Выйти</button>
      </> : <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <label className="block"><span className="field-label"><UserRound size={14}/> Ваше имя</span><input className={`field ${touched.name && nameError ? 'field-invalid' : ''}`} type="text" autoComplete="name" placeholder="Введите ваше имя" value={name} onChange={e => setName(e.target.value.slice(0, 80))} onBlur={() => setTouched(t => ({...t, name: true}))} required maxLength={80} disabled={sent}/>{touched.name && nameError && <span className="field-error">{nameError}</span>}</label>
        <div><span className="field-label"><Phone size={14}/> Номер телефона</span><div className="phone-entry mt-2">
          <select className="country-select" aria-label="Код страны" value={countryIso} onChange={e => {setCountryIso(e.target.value); setTouched(t => ({...t, phone: false})); setError('');}} disabled={sent}>{countries.map(c => <option key={c.iso} value={c.iso}>{countryFlag(c.iso)} +{getCountryCallingCode(c.iso)} · {c.iso}</option>)}</select>
          <input className={`field phone-number ${touched.phone && phoneError ? 'field-invalid' : ''}`} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="Номер телефона" value={localPhone} maxLength={nationalMaxLength} onChange={e => setLocalPhone(e.target.value.replace(/\\D/g, '').slice(0, nationalMaxLength))} onBlur={() => setTouched(t => ({...t, phone: true}))} required disabled={sent} aria-label="Номер телефона без кода страны"/>
        </div>{touched.phone && phoneError && <span className="field-error">{phoneError}</span>}</div>
        {sent && <label className="block"><span className="field-label">Код подтверждения</span><input className="field text-center text-xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={code} onChange={e => setCode(e.target.value.replace(/\\D/g, '').slice(0, 4))} required/><p className="mt-2 text-xs text-slate-500">Демо: код выводится в консоль сервера.</p></label>}
        {error && <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={busy || (sent && code.length !== 4)} className="btn-primary w-full">{busy ? <><LoaderCircle size={17} className="animate-spin"/> Подождите...</> : sent ? 'Подтвердить и создать профиль' : 'Получить код подтверждения'}</button>
        {sent && <button type="button" onClick={() => {setSent(false); setCode(''); setError('');}} className="w-full text-sm text-slate-400">Изменить данные</button>}
        <div className="telegram-login-section mt-5">
          <div className="telegram-divider"><span>или</span></div>
          {telegramBotUsername
            ? <div ref={telegramWidgetRef} className="telegram-widget-slot" aria-label="Войти через Telegram"/>
            : <button type="button" disabled className="telegram-login-button" title="Telegram-вход пока не настроен"><Send size={18}/> {telegramConfigReady ? 'Войти через Telegram — временно недоступно' : 'Подключаем Telegram…'}</button>}
        </div>
      </form>}
    </section>
  </main>;
}
