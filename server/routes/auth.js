import { Router } from 'express';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
const router = Router();
const codes = new Map();
const normalizePhone = phone => String(phone || '').replace(/[^\d+]/g, '');
function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}
function validTelegramPayload(data, botToken) {
  if (!data || !data.hash || !botToken) return false;
  const { hash, ...fields } = data;
  const authDate = Number(fields.auth_date);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) return false;
  const checkString = Object.keys(fields).sort().map(key => `${key}=${fields[key]}`).join('\n');
  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(String(hash), 'hex')); } catch { return false; }
}
router.post('/request-code', (req, res) => {
  const phone = normalizePhone(req.body.phone);
  if (!/^\+?\d{8,15}$/.test(phone)) return res.status(400).json({ message: 'Введите корректный номер телефона' });
  const code = String(crypto.randomInt(0, 10000)).padStart(4, '0');
  codes.set(phone, { code, expires: Date.now() + 5 * 60 * 1000, attempts: 0 });
  console.log(`[DEV SMS] ${phone}: ${code} (expires in 5 minutes)`);
  res.json({ message: 'Код сгенерирован. Для локального теста смотрите консоль сервера.' });
});
router.post('/verify-code', async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone), code = String(req.body.code || ''), record = codes.get(phone);
    if (!record || record.expires < Date.now() || record.attempts >= 5) { codes.delete(phone); return res.status(400).json({ message: 'Код истёк или не запрошен. Запросите новый код.' }); }
    record.attempts += 1;
    if (record.code !== code) return res.status(400).json({ message: 'Неверный код' });
    codes.delete(phone);
    const user = await User.findOneAndUpdate({ phone }, { $setOnInsert: { phone, name: '' } }, { new: true, upsert: true });
    res.json({ token: issueToken(user), user: { id: user._id, phone: user.phone, name: user.name, role: user.role } });
  } catch (e) { next(e); }
});
router.post('/telegram', async (req, res, next) => {
  try {
    const data = req.body;
    if (!validTelegramPayload(data, process.env.TELEGRAM_BOT_TOKEN)) return res.status(401).json({ message: 'Telegram authentication data is invalid or expired' });
    const telegramId = String(data.id), name = [data.first_name, data.last_name].filter(Boolean).join(' ').slice(0, 120);
    const user = await User.findOneAndUpdate({ telegramId }, { $set: { name }, $setOnInsert: { telegramId } }, { new: true, upsert: true });
    res.json({ token: issueToken(user), user: { id: user._id, name: user.name, role: user.role, telegramId: user.telegramId } });
  } catch (e) { next(e); }
});
export default router;
