import { ArrowUpRight, Instagram, Phone, Send, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';

const CONTACTS = {
  phone: {
    href: 'tel:+79262770808',
    label: 'Телефон магазина',
    value: '+79262770808',
  },
  instagram: {
    href: 'https://instagram.com/arzon_market_ru',
    label: 'Instagram',
    value: '@arzon_market_ru',
  },
  telegram: {
    href: 'https://t.me/ARZON_MARKET_RU',
    label: 'Telegram',
    value: '@ARZON_MARKET_RU',
  },
};

function ContactCard({ href, label, value, icon: Icon, tone, external = false }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={`group flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition ${tone}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04]">
          <Icon size={19} />
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-slate-500">{label}</span>
          <span className="mt-1 block break-words font-semibold text-white group-hover:text-current">
            {value}
          </span>
        </span>
      </span>
      {external && (
        <ArrowUpRight
          size={17}
          className="ml-2 shrink-0 text-slate-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </a>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer mb-20 border-t md:mb-0">
      <div className="container-shell py-9 sm:py-11">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-12">
          <div>
            <Link to="/" className="brand-mark inline-flex items-center gap-2 font-black">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
                <Smartphone size={20} className="text-accent" aria-hidden="true" />
              </span>
              <span className="text-lg text-white">
                arzon<span className="text-accent">market</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
              Технологии ближе. Выбирайте нужное и оставайтесь на связи с ArzonMarket.
            </p>
          </div>

          <section aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Связаться с нами
            </h2>
            <div className="mt-4">
              <ContactCard
                {...CONTACTS.phone}
                icon={Phone}
                tone="hover:border-accent/40 hover:bg-accent/5"
              />
            </div>
          </section>

          <section aria-labelledby="footer-social-heading">
            <h2 id="footer-social-heading" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Мы в соцсетях
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <ContactCard
                {...CONTACTS.instagram}
                icon={Instagram}
                external
                tone="text-pink-400 hover:border-pink-400/40 hover:bg-pink-500/5"
              />
              <ContactCard
                {...CONTACTS.telegram}
                icon={Send}
                external
                tone="text-sky-400 hover:border-sky-400/40 hover:bg-sky-500/5"
              />
            </div>
          </section>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/[0.08] pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Технологии ближе.</p>
          <p>© {new Date().getFullYear()} ArzonMarket. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
}
