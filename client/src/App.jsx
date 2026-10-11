import Footer from './components/layout/Footer';
import Navbar from './components/Navbar';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <div className="app-shell flex min-h-screen flex-col bg-ink text-slate-200">
      <Navbar />
      <div className="flex flex-1 flex-col">
        <AppRoutes />
      </div>
      <Footer />
    </div>
  );
}
