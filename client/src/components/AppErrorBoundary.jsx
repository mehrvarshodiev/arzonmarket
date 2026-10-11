import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('ArzonMarket render error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="container-shell error-screen">
        <div className="error-panel">
          <AlertTriangle size={28} className="text-accent" />
          <h1>Не удалось открыть страницу</h1>
          <p>Попробуйте перезагрузить сайт. Если проблема повторится, откройте страницу позже.</p>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            <RotateCw size={17} /> Перезагрузить
          </button>
        </div>
      </main>
    );
  }
}
