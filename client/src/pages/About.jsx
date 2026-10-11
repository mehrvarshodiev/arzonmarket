import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  BadgeDollarSign,
  Factory,
  Gift,
  Headphones,
  Instagram,
  MapPin,
  Send,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Truck,
  HeartHandshake,
} from 'lucide-react';

const standards = [
  {
    Icon: BadgeCheck,
    title: 'Оригинальность и гарантия',
    description: 'Подбираем оригинальные гаджеты и выдаём гарантийный талон к каждому смартфону. Покупайте с уверенностью.',
    number: '01',
  },
  {
    Icon: BadgeDollarSign,
    title: 'Честная цена',
    description: 'Работаем над тем, чтобы современные технологии оставались доступными — без лишних розничных наценок.',
    number: '02',
  },
  {
    Icon: Gift,
    title: 'Подарки к покупке',
    description: 'При покупке телефона дарим полезные аксессуары: чехол и защиту экрана — стекло или ламинацию.',
    number: '03',
  },
  {
    Icon: HeartHandshake,
    title: 'Сервис с человеческим отношением',
    description: 'Сохранили главное из Instagram: отвечаем на вопросы, помогаем разобраться и не оставляем один на один с выбором.',
    number: '04',
  },
];

const promises = [
  { Icon: Smartphone, label: 'Современные смартфоны', detail: 'Samsung, Xiaomi, Redmi, Honor и другие' },
  { Icon: ShieldCheck, label: 'Проверка перед отправкой', detail: 'Внимательно проверяем комплект и состояние устройства' },
  { Icon: PackageCheck, label: 'Гарантийный талон', detail: 'Понятные условия гарантии на смартфоны' },
];

export default function About() {
  return (
    <main className="container-shell space-y-14 pb-14 pt-8 md:space-y-20 md:pt-12">
      <section className="hero-panel about-hero relative overflow-hidden rounded-[2rem] border border-white/10 px-6 py-10 sm:px-10 sm:py-14 md:px-16 md:py-16">
        <div className="relative z-10 max-w-3xl">
          <p className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> НАША ИСТОРИЯ · НАШ ПОДХОД</p>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            Из Instagram — в твой удобный мир <span className="text-accent">технологий.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Arzon Market вырос из живого Instagram-магазина в место, где выбирать смартфоны и аксессуары стало ещё проще. Та же команда, то же внимание к людям — теперь в удобном формате сайта.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/catalog" className="btn-primary">Выбрать гаджет <ArrowRight size={18} /></Link>
            <a href="https://www.instagram.com/arzon_market_ru/" target="_blank" rel="noreferrer" className="btn-secondary"><Instagram size={17} /> Мы в Instagram</a>
          </div>
        </div>
        <div className="about-hero-art" aria-hidden="true">
          <div className="about-hero-glow" />
          <div className="about-phone-card">
            <span className="about-phone-camera" />
            <span className="about-phone-lens" />
            <span className="about-phone-mark">A</span>
          </div>
          <span className="about-floating-chip">ARZON = ДОСТУПНО</span>
        </div>
      </section>

      <section className="grid items-start gap-8 md:grid-cols-[1.05fr_.95fr] md:gap-14">
        <div>
          <p className="eyebrow">РАДЫ ЗНАКОМСТВУ</p>
          <h2 className="section-title mt-3">Добро пожаловать в Arzon Market</h2>
        </div>
        <div className="space-y-4 text-sm leading-7 text-slate-400 sm:text-base">
          <p>Если ты когда-нибудь писал нам в Директ, смотрел наши видеообзоры или спрашивал, какой смартфон лучше подойдёт именно тебе, — возможно, наша история тебе уже знакома.</p>
          <p>За каждым заказом на этом сайте стоит опыт настоящего общения с покупателями. Мы выросли благодаря доверию людей, которые хотели видеть реальные устройства, получать честные ответы и покупать без лишних сомнений.</p>
          <p className="text-slate-200">Теперь оформить заказ можно в несколько шагов — а человеческое отношение, помощь с выбором и внимание к деталям остаются с нами.</p>
          <a href="https://www.instagram.com/arzon_market_ru/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold text-accent hover:opacity-80"><Instagram size={17} /> Загляни в наш Instagram <ArrowRight size={16} /></a>
        </div>
      </section>

      <section className="about-value-panel overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-9 md:p-12">
        <div className="grid gap-8 md:grid-cols-[.85fr_1.15fr] md:items-center">
          <div>
            <p className="eyebrow">СМЫСЛ В НАЗВАНИИ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Почему «Arzon» — это больше, чем просто слово?</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-slate-300 sm:text-base">
            <p><strong className="text-white">Arzon</strong> означает «доступный», «недорогой». Для нас это не про компромисс в качестве, а про разумную цену за хорошую технику.</p>
            <p>Мы выстраиваем прямые поставки от проверенных партнёров и фабрик, в том числе из Китая, оптимизируем логистику и придерживаемся честной маржи. Так меньше лишних звеньев между поставщиком и покупателем — и больше смысла в цене.</p>
            <p>Наша цель проста: чтобы ты выбирал гаджет по возможностям и потребностям, а не переплачивал за ненужные наценки.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div><p className="eyebrow">НА ЧТО МОЖЕШЬ РАССЧИТЫВАТЬ</p><h2 className="section-title">Наши стандарты — без компромиссов</h2></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {standards.map(({ Icon, title, description, number }) => (
            <article key={number} className="about-standard-card">
              <div className="flex items-start justify-between gap-4">
                <span className="about-standard-icon"><Icon size={22} /></span>
                <span className="about-standard-number">{number}</span>
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </article>
          ))}
        </div>
        <div className="about-gift-strip mt-5 grid gap-5 rounded-3xl border border-white/10 p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-7">
          <div className="about-gift-illustration" aria-hidden="true"><Gift size={38} /></div>
          <div>
            <p className="text-xs font-extrabold tracking-[.16em] text-accent">МАЛЕНЬКИЙ БОНУС, КОТОРЫЙ ПРИЯТНО ПОЛУЧИТЬ</p>
            <h3 className="mt-2 text-xl font-black text-white">Телефон — с заботой с первого дня</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">При покупке смартфона добавляем подарок: чехол и защиту экрана. Чтобы можно было пользоваться обновкой спокойнее с самого начала.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
        <div>
          <p className="eyebrow">ОТ ПОСТАВЩИКА ДО ТВОИХ РУК</p>
          <h2 className="section-title mt-3">Откуда берутся новинки?</h2>
          <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">Мы закупаем технику у проверенных поставщиков и напрямую у фабрик, включая партнёров в Китае. Перед отправкой внимательно проверяем коробку, комплектность и состояние устройства, чтобы заказ приехал к тебе в ожидаемом виде.</p>
          <div className="mt-6 flex items-center gap-3 text-sm font-semibold text-slate-200"><Factory className="shrink-0 text-accent" size={20} /> Поставки, которым уделяем внимание</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {promises.map(({ Icon, label, detail }) => (
            <div key={label} className="about-promise-card">
              <Icon className="text-accent" size={23} />
              <h3 className="mt-4 font-bold text-white">{label}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>


      <section className="about-map-panel overflow-hidden rounded-3xl border border-white/10">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <p className="eyebrow"><MapPin size={15} /> НАЙДИ НАС</p>
            <h2 className="section-title mt-3">Наш магазин</h2>
            <p className="mt-4 flex items-start gap-3 text-sm leading-7 text-slate-300 sm:text-base">
              <MapPin className="mt-1 shrink-0 text-accent" size={20} />
              <span>Метро «Сходненская», выход № 1, торговый центр «Оранжевый мир», 3-й этаж, магазин «Арзон Маркет», Москва.</span>
            </p>
            <a href="https://yandex.ru/maps/?text=%D0%BC%D0%B5%D1%82%D1%80%D0%BE%20%D0%A1%D1%85%D0%BE%D0%B4%D0%BD%D0%B5%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%2C%20%D0%B2%D1%8B%D1%85%D0%BE%D0%B4%20%E2%84%96%201%2C%20%D0%A2%D0%A6%20%D0%9E%D1%80%D0%B0%D0%BD%D0%B6%D0%B5%D0%B2%D1%8B%D0%B9%20%D0%BC%D0%B8%D1%80%2C%203%20%D1%8D%D1%82%D0%B0%D0%B6%2C%20%D0%90%D1%80%D0%B7%D0%BE%D0%BD%20%D0%9C%D0%B0%D1%80%D0%BA%D0%B5%D1%82%2C%20%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0" target="_blank" rel="noreferrer" className="btn-secondary mt-5 inline-flex">
              <MapPin size={17} /> Открыть в Яндекс Картах <ArrowRight size={17} />
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
            <iframe
              title="Arzon Market на Яндекс Картах"
              src="https://yandex.ru/map-widget/v1/?text=%D0%BC%D0%B5%D1%82%D1%80%D0%BE%20%D0%A1%D1%85%D0%BE%D0%B4%D0%BD%D0%B5%D0%BD%D1%81%D0%BA%D0%B0%D1%8F%2C%20%D0%B2%D1%8B%D1%85%D0%BE%D0%B4%20%E2%84%96%201%2C%20%D0%A2%D0%A6%20%D0%9E%D1%80%D0%B0%D0%BD%D0%B6%D0%B5%D0%B2%D1%8B%D0%B9%20%D0%BC%D0%B8%D1%80%2C%203%20%D1%8D%D1%82%D0%B0%D0%B6%2C%20%D0%90%D1%80%D0%B7%D0%BE%D0%BD%20%D0%9C%D0%B0%D1%80%D0%BA%D0%B5%D1%82%2C%20%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0"
              width="100%"
              height="360"
              loading="lazy"
              allowFullScreen
              className="block w-full"
            />
          </div>
        </div>
      </section>

      <section className="about-cta rounded-[2rem] border border-white/10 px-6 py-9 text-center sm:px-10 sm:py-12">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent text-ink"><Headphones size={23} /></span>
        <p className="eyebrow mt-5 justify-center">МЫ РЯДОМ, ЕСЛИ НУЖНА ПОМОЩЬ</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">Технологии должны радовать. Давай найдём твою.</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-400">Уже знаешь, что нужно? Загляни в каталог. Сравниваешь модели и не уверен? Напиши нам в Instagram — поможем разобраться.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/catalog" className="btn-primary">Перейти в каталог <ArrowRight size={18} /></Link>
          <a href="https://t.me/mehrvar_01" target="_blank" rel="noreferrer" className="btn-secondary"><Send size={17} /> Написать в Telegram</a>
        </div>
      </section>
    </main>
  );
}
