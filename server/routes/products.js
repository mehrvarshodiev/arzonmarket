import { Router } from 'express';
import Product from '../models/Product.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();
const cleanProduct = body => ({
  name: String(body.name || '').trim(), description: String(body.description || '').trim(),
  price: Number(body.price), oldPrice: body.oldPrice === '' || body.oldPrice == null ? null : Number(body.oldPrice),
  category: body.category, brand: String(body.brand || '').trim(),
  images: Array.isArray(body.images) ? body.images.map(String).filter(s => /^https?:\/\//i.test(s)).slice(0, 10) : [],
  specs: Array.isArray(body.specs) ? body.specs.filter(s => s && String(s.key || '').trim() && String(s.value || '').trim()).map(s => ({ key: String(s.key).trim(), value: String(s.value).trim() })).slice(0, 50) : [],
  featured: Boolean(body.featured), stock: Math.max(0, Number(body.stock || 0))
});
router.get('/', async (req, res, next) => {
  try {
    const { type, brand, minPrice, maxPrice, sort, q, featured } = req.query, filter = {};
    if (type && ['Телефоны', 'Аксессуары'].includes(type)) filter.category = type;
    if (brand) filter.brand = brand;
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && minPrice !== '') filter.price.$gte = Math.max(0, Number(minPrice) || 0);
      if (maxPrice !== undefined && maxPrice !== '') filter.price.$lte = Math.max(0, Number(maxPrice) || 0);
    }
    if (q) filter.$text = { $search: String(q).slice(0, 100) };
    if (featured === 'true') filter.featured = true;
    const sortMap = { cheap: { price: 1 }, expensive: { price: -1 }, newest: { createdAt: -1 }, popular: { featured: -1, createdAt: -1 } };
    res.json(await Product.find(filter).sort(sortMap[sort] || { createdAt: -1 }).limit(200).lean());
  } catch (e) { next(e); }
});
router.get('/:id', async (req, res, next) => {
  try { const p = await Product.findById(req.params.id); if (!p) return res.status(404).json({ message: 'Товар не найден' }); res.json(p); }
  catch (e) { next(e); }
});
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = cleanProduct(req.body);
    if (!data.name || !data.brand || !['Телефоны', 'Аксессуары'].includes(data.category) || !Number.isFinite(data.price) || data.price < 0) return res.status(400).json({ message: 'Проверьте название, бренд, категорию и цену' });
    res.status(201).json(await Product.create(data));
  } catch (e) { next(e); }
});
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = cleanProduct(req.body);
    if (!data.name || !data.brand || !['Телефоны', 'Аксессуары'].includes(data.category) || !Number.isFinite(data.price) || data.price < 0) return res.status(400).json({ message: 'Проверьте название, бренд, категорию и цену' });
    const p = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ message: 'Товар не найден' }); res.json(p);
  } catch (e) { next(e); }
});
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try { const p = await Product.findByIdAndDelete(req.params.id); if (!p) return res.status(404).json({ message: 'Товар не найден' }); res.json({ message: 'Товар удалён' }); }
  catch (e) { next(e); }
});
export default router;
