import { LoaderCircle, Smartphone } from 'lucide-react';

export default function AppLoader({ message = 'Готовим магазин…', fullScreen = false }) {
  return (
    <div className={fullScreen ? 'app-loader app-loader-screen' : 'app-loader'} role="status" aria-live="polite">
      <div className="loader-brand">
        <span className="loader-brand-icon"><Smartphone size={22} /></span>
        <span>arzon<span className="text-accent">market</span></span>
      </div>
      <div className="loader-orbit" aria-hidden="true">
        <span className="loader-orbit-dot" />
        <LoaderCircle className="loader-spinner" size={34} strokeWidth={1.7} />
      </div>
      <p className="loader-message">{message}</p>
      <span className="loader-caption">Технологии ближе</span>
    </div>
  );
}
