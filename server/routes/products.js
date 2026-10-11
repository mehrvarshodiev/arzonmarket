import { Router } from 'express';
import Product from '../models/Product.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const DEFAULT_CATEGORIES = ['Телефоны', 'Аксессуары'];

const cleanProduct = body => ({
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  price: Number(body.price),
  oldPrice: body.oldPrice === '' || body.oldPrice == null ? null : Number(body.oldPrice),
  category: String(body.category || '').trim(),
  brand: String(body.brand || '').trim(),
  images: Array.isArray(body.images) ? body.images.map(String).filter(s => /^https?:\/\//i.test(s)).slice(0, 10) : [],
  specs: Array.isArray(body.specs) ? body.specs.filter(s => s && String(s.key || '').trim() && String(s.value || '').trim()).map(s => ({ key: String(s.key).trim(), value: String(s.value).trim() })).slice(0, 50) : [],
  featured: Boolean(body.featured),
  stock: Math.max(0, Number(body.stock || 0))
});

const validateProduct = data =>
  data.name &&
  data.brand &&
  data.category &&
  data.category.length <= 80 &&
  Number.isFinite(data.price) &&
  data.price >= 0 &&
  (data.oldPrice === null || (Number.isFinite(data.oldPrice) && data.oldPrice >= 0)) &&
  Number.isFinite(data.stock);

router.get('/categories', async (_req, res, next) => {
  try {
    const stored = await Product.distinct('category', { category: { $type: 'string', $ne: '' } });
    const categories = [...new Set([...DEFAULT_CATEGORIES, ...stored])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'ru'));
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(categories);
  } catch (e) { next(e); }
});

router.get('/', async (req, res, next) => {
  try {
    const { type, category, brand, minPrice, maxPrice, sort, q, featured } = req.query;
    const filter = {};
    const categoryFilter = String(category || type || '').trim();
    if (categoryFilter) filter.category = categoryFilter;
    if (brand) filter.brand = String(brand).trim();
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && minPrice !== '') filter.price.$gte = Math.max(0, Number(minPrice) || 0);
      if (maxPrice !== undefined && maxPrice !== '') filter.price.$lte = Math.max(0, Number(maxPrice) || 0);
    }
    if (q) filter.$text = { $search: String(q).slice(0, 100) };
    if (featured === 'true') filter.featured = true;
    const sortMap = { cheap: { price: 1 }, expensive: { price: -1 }, newest: { createdAt: -1 }, popular: { featured: -1, createdAt: -1 } };
    const products = await Product.find(filter).sort(sortMap[sort] || { createdAt: -1 }).limit(200).lean();
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    res.json(products);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const p = await Product.findById(req.params.id);
    if (!p) return res.status(404).json({ message: 'Товар не найден' });
    res.json(p);
  } catch (e) { next(e); }
});

router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = cleanProduct(req.body);
    if (!validateProduct(data)) return res.status(400).json({ message: 'Проверьте название, бренд, категорию, цену, старую цену и остаток' });
    res.status(201).json(await Product.create(data));
  } catch (e) { next(e); }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = cleanProduct(req.body);
    if (!validateProduct(data)) return res.status(400).json({ message: 'Проверьте название, бренд, категорию, цену, старую цену и остаток' });
    const p = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!p) return res.status(404).json({ message: 'Товар не найден' });
    res.json(p);
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ message: 'Товар не найден' });
    res.json({ message: 'Товар удалён' });
  } catch (e) { next(e); }
});

export default router;
