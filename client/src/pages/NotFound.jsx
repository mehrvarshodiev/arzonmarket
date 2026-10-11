import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="container-shell py-24 text-center">
      <h1 className="text-4xl font-black text-white">404</h1>
      <p className="mt-3 text-slate-400">Страница не найдена</p>
      <Link to="/" className="btn-primary mt-6">
        На главную
      </Link>
    </main>
  );
}
