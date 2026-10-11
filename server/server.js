import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { supabase } from './lib/supabase.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map(s => s.trim()) : 'http://localhost:5173',
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), orderRoutes);
app.get('/api/health', async (_req, res) => {
  const { error } = await supabase.from('products').select('id', { head: true, count: 'exact' }).limit(1);
  if (error) return res.status(503).json({ status: 'error', service: 'arzonmarket-api', database: 'unavailable' });
  res.json({ status: 'ok', service: 'arzonmarket-api', database: 'connected' });
});
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Internal server error' });
});

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`ArzonMarket API listening on :${port}`));
