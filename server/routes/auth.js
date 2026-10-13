import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';
import parsePhoneNumber from 'libphonenumber-js/max';

const router = Router();
const codes = new Map();
const normalizePhone = phone => String(phone || '').trim();
const isValidE164Phone = value => {
  if (!/^\+[1-9]\d{1,14}$/.test(value)) return false;
  const parsed = parsePhoneNumber(value, { extract: false });
  return Boolean(parsed && parsed.number === value && parsed.isValid());
};
const normalizeName = name => String(name || '').trim().replace(/\s+/g, ' ');
const validName = name => name.length >= 2 && name.length <= 60 && /\p{L}/u.test(name) && /^[\p{L}\p{M} .'-]+$/u.test(name);
function issueToken(user) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}
router.post('/request-code', (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!isValidE164Phone(phone)) return res.status(400).json({ message: 'Введите корректный номер телефона в международном формате E.164' });
  const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
  codes.set(phone, { code, expires: Date.now() + 5 * 60 * 1000, attempts: 0 });
  if (process.env.NODE_ENV !== 'production') console.log(`[DEV SMS] ${phone}: ${code} (expires in 5 minutes)`);
  res.json({ message: process.env.NODE_ENV === 'production' ? 'Если номер поддерживается, код будет отправлен.' : 'Код создан для локального теста; смотрите консоль сервера.' });
});
router.post('/verify-code', async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone), code = String(req.body.code || ''), name = normalizeName(req.body.name), record = codes.get(phone);
    if (!isValidE164Phone(phone)) return res.status(400).json({ message: 'Введите корректный номер телефона в международном формате E.164' });
    if (!validName(name)) return res.status(400).json({ message: 'Имя должно содержать от 2 до 60 символов и состоять из букв, пробелов, дефиса или апострофа.' });
    if (!/^\d{4}$/.test(code)) return res.status(400).json({ message: 'Введите 4-значный код подтверждения' });
    if (!record || record.expires < Date.now() || record.attempts >= 5) { codes.delete(phone); return res.status(400).json({ message: 'Код истёк или не запрошен. Запросите новый код.' }); }
    record.attempts += 1;
    if (record.code !== code) return res.status(400).json({ message: 'Неверный код' });
    codes.delete(phone);
    const { data: existing, error: lookupError } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    if (lookupError) throw lookupError;
    let user = existing;
    if (user) {
      const { data, error } = await supabase.from('users').update({ name }).eq('id', user.id).select('*').single();
      if (error) throw error;
      user = data;
    } else {
      const { data, error } = await supabase.from('users').insert({ phone, name }).select('*').single();
      if (error) throw error;
      user = data;
    }
    res.json({ token: issueToken(user), user: { id: user.id, phone: user.phone, name: user.name, role: user.role } });
  } catch (e) { next(e); }
});
export default router;
