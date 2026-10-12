import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const DEFAULT_CATEGORIES = ['Телефоны', 'Аксессуары'];
const mapProduct = p => ({
  ...p, oldPrice: p.old_price, createdAt: p.created_at, updatedAt: p.updated_at
});
const cleanProduct = body => ({
  name: String(body.name || '').trim(),
  description: String(body.description || '').trim(),
  price: Number(body.price),
  old_price: body.oldPrice === '' || body.oldPrice == null ? null : Number(body.oldPrice),
  category: String(body.category || '').trim(),
  brand: String(body.brand || '').trim(),
  images: Array.isArray(body.images) ? body.images.map(String).filter(s => /^https?:\/\//i.test(s)).slice(0, 10) : [],
  specs: [...(Array.isArray(body.specs) ? body.specs.filter(s => s && String(s.key || '').trim() && String(s.value || '').trim() && String(s.key).trim() !== 'Цвет').map(s => ({ key: String(s.key).trim(), value: String(s.value).trim() })) : []), ...(Array.isArray(body.colors) ? body.colors : typeof body.colors === 'string' ? body.colors.split(/[,;\\n]/) : []).map(s => String(s).trim()).filter(Boolean).slice(0, 12).map(value => ({ key: 'Цвет', value }))].slice(0, 50),
  featured: Boolean(body.featured),
  stock: Math.max(0, Math.floor(Number(body.stock || 0)))
});
const valid = d => d.name && d.name.length <= 180 && d.brand && d.brand.length <= 80 && d.category && d.category.length <= 80 && Number.isFinite(d.price) && d.price >= 0 && (d.old_price === null || (Number.isFinite(d.old_price) && d.old_price >= 0)) && Number.isFinite(d.stock);

router.get('/categories', async (_req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').select('category').eq('is_active', true);
    if (error) throw error;
    const categories = [...new Set([...DEFAULT_CATEGORIES, ...(data || []).map(p => p.category).filter(Boolean)])].sort((a,b) => a.localeCompare(b, 'ru'));
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300').json(categories);
  } catch (e) { next(e); }
});
router.get('/', async (req, res, next) => {
  try {
    const { type, category, brand, minPrice, maxPrice, sort, q, featured } = req.query;
    let query = supabase.from('products').select('*').eq('is_active', true).limit(200);
    const cat = String(category || type || '').trim();
    if (cat) query = query.eq('category', cat);
    if (brand) query = query.eq('brand', String(brand).trim());
    if (minPrice !== undefined && minPrice !== '') query = query.gte('price', Math.max(0, Number(minPrice) || 0));
    if (maxPrice !== undefined && maxPrice !== '') query = query.lte('price', Math.max(0, Number(maxPrice) || 0));
    if (featured === 'true') query = query.eq('featured', true);
    if (q) query = query.or(`name.ilike.%${String(q).slice(0,60).replace(/[,%()]/g,'')}%,description.ilike.%${String(q).slice(0,60).replace(/[,%()]/g,'')}%`);
    if (sort === 'cheap') query = query.order('price', { ascending: true });
    else if (sort === 'expensive') query = query.order('price', { ascending: false });
    else if (sort === 'popular') query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120').json((data || []).map(mapProduct));
  } catch (e) { next(e); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', req.params.id).eq('is_active', true).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Товар не найден' });
    res.json(mapProduct(data));
  } catch (e) { next(e); }
});
router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = cleanProduct(req.body);
    if (!valid(data)) return res.status(400).json({ message: 'Проверьте название, бренд, категорию, цену, старую цену и остаток' });
    const { data: row, error } = await supabase.from('products').insert(data).select('*').single();
    if (error) throw error;
    res.status(201).json(mapProduct(row));
  } catch (e) { next(e); }
});
router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const data = cleanProduct(req.body);
    if (!valid(data)) return res.status(400).json({ message: 'Проверьте название, бренд, категорию, цену, старую цену и остаток' });
    const { data: row, error } = await supabase.from('products').update({ ...data, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('*').maybeSingle();
    if (error) throw error;
    if (!row) return res.status(404).json({ message: 'Товар не найден' });
    res.json(mapProduct(row));
  } catch (e) { next(e); }
});
router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', req.params.id).select('id').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Товар не найден' });
    res.json({ message: 'Товар удалён' });
  } catch (e) { next(e); }
});
export default router;
