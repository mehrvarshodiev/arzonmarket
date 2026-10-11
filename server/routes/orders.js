import { Router } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const customer = { name: String(req.body.name || '').trim(), phone: String(req.body.phone || '').trim(), city: String(req.body.city || '').trim(), address: String(req.body.address || '').trim() };
    if (Object.values(customer).some(v => !v) || customer.name.length > 120 || customer.address.length > 300) return res.status(400).json({ message: 'Заполните все поля доставки корректно' });
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    if (!rawItems.length || rawItems.length > 50) return res.status(400).json({ message: 'Корзина пуста или содержит слишком много позиций' });
    const quantities = new Map();
    for (const item of rawItems) {
      if (!mongoose.isValidObjectId(item.id)) return res.status(400).json({ message: 'Некорректный товар в корзине' });
      const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
      quantities.set(String(item.id), Math.min(99, (quantities.get(String(item.id)) || 0) + qty));
    }
    const products = await Product.find({ _id: { $in: [...quantities.keys()] } });
    if (products.length !== quantities.size) return res.status(400).json({ message: 'Один из товаров больше недоступен' });
    const items = products.map(p => ({ product: p._id, name: p.name, price: p.price, quantity: quantities.get(String(p._id)) }));
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const order = await Order.create({ user: req.user.sub, customer, items, total });
    const lines = ['📦 Новый заказ на ArzonMarket!', `👤 Покупатель: ${customer.name}`, `📞 Телефон: ${customer.phone}`, `📍 Доставка: ${customer.city}, ${customer.address}`, '🛒 Товары:', ...items.map(i => `- ${i.name} x ${i.quantity} — ${(i.price * i.quantity).toLocaleString('ru-RU')} сум.`), `💰 Итого к оплате: ${total.toLocaleString('ru-RU')} сум.`, `🧾 Заказ: ${order._id}`];
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: lines.join('\n') }) });
        if (!response.ok) console.error('Telegram notification failed:', await response.text());
      } catch (err) { console.error('Telegram notification error:', err.message); }
    } else console.warn('Telegram is not configured; order saved without notification.');
    res.status(201).json({ message: 'Заказ оформлен', orderId: order._id, total });
  } catch (e) { next(e); }
});
router.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try { res.json(await Order.find().sort({ createdAt: -1 }).limit(300).lean()); } catch (e) { next(e); }
});
export default router;
