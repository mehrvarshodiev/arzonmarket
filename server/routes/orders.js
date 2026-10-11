import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
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
      const id = String(item.id || '');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return res.status(400).json({ message: 'Некорректный товар в корзине' });
      const qty = Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1)));
      quantities.set(id, Math.min(99, (quantities.get(id) || 0) + qty));
    }
    const { data: products, error: productError } = await supabase.from('products').select('id,name,price,stock,is_active').in('id', [...quantities.keys()]);
    if (productError) throw productError;
    if (!products || products.length !== quantities.size || products.some(p => !p.is_active)) return res.status(400).json({ message: 'Один из товаров больше недоступен' });
    for (const p of products) if (p.stock < quantities.get(p.id)) return res.status(400).json({ message: `Недостаточно товара «${p.name}» на складе` });
    const items = products.map(p => ({ product: p.id, name: p.name, price: Number(p.price), quantity: quantities.get(p.id) }));
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const { data: order, error } = await supabase.from('orders').insert({
      customer_name: customer.name, phone: customer.phone, address: `${customer.city}, ${customer.address}`,
      items, total, status: 'new'
    }).select('id,created_at,total').single();
    if (error) throw error;
    const lines = ['📦 Новый заказ на ArzonMarket!', `👤 Покупатель: ${customer.name}`, `📞 Телефон: ${customer.phone}`, `📍 Доставка: ${customer.city}, ${customer.address}`, '🛒 Товары:', ...items.map(i => `- ${i.name} x ${i.quantity} — ${(i.price * i.quantity).toLocaleString('ru-RU')} сум.`), `💰 Итого к оплате: ${total.toLocaleString('ru-RU')} сум.`, `🧾 Заказ: ${order.id}`];
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: lines.join('\n') }) });
        if (!response.ok) console.error('Telegram notification failed:', await response.text());
      } catch (err) { console.error('Telegram notification error:', err.message); }
    }
    res.status(201).json({ message: 'Заказ оформлен', orderId: order.id, total: Number(order.total) });
  } catch (e) { next(e); }
});
router.get('/', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300);
    if (error) throw error;
    res.json((data || []).map(o => ({ ...o, createdAt: o.created_at, customer: { name: o.customer_name, phone: o.phone, address: o.address }, _id: o.id })));
  } catch (e) { next(e); }
});
export default router;
