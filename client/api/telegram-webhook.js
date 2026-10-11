import { MongoClient } from 'mongodb';

const globalForMongo = globalThis;
let cached = globalForMongo.__arzonMarketMongo;
if (!cached) {
  cached = { client: null, promise: null };
  globalForMongo.__arzonMarketMongo = cached;
}

async function getDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not configured');
  if (!cached.promise) {
    cached.client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
    cached.promise = cached.client.connect().catch((error) => {
      cached.client = null;
      cached.promise = null;
      throw error;
    });
  }
  await cached.promise;
  const dbName = process.env.MONGO_DB_NAME || 'arzonmarket';
  return cached.client.db(dbName);
}

async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not configured');
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.description || 'Telegram API error');
  return result.result;
}

async function send(chatId, text) {
  return telegram('sendMessage', { chat_id: chatId, text });
}

const STEPS = [
  ['name', 'Напиши название товара:'],
  ['brand', 'Напиши бренд или производителя:'],
  ['category', 'Напиши категорию (например, Телефоны):'],
  ['price', 'Напиши цену числом:'],
  ['stock', 'Напиши количество на складе:'],
  ['description', 'Напиши описание или отправь — если без описания:'],
  ['image', 'Отправь прямую HTTPS-ссылку на фото или напиши — если без фото:']
];

function response(res, status, body) {
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return response(res, 405, { ok: false, message: 'Method not allowed' });
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && req.headers['x-telegram-bot-api-secret-token'] !== expectedSecret) {
    return response(res, 401, { ok: false, message: 'Unauthorized' });
  }

  try {
    const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const message = update?.message;
    if (!message?.chat?.id || !message?.from?.id || typeof message.text !== 'string') {
      return response(res, 200, { ok: true });
    }

    const admins = (process.env.TELEGRAM_ADMIN_IDS || '').split(',').map((value) => value.trim()).filter(Boolean);
    const userId = String(message.from.id);
    if (!admins.includes(userId)) {
      await send(message.chat.id, '⛔ Этот бот доступен только администратору магазина.');
      return response(res, 200, { ok: true });
    }

    const db = await getDb();
    const drafts = db.collection('telegram_product_drafts');
    const products = db.collection('products');
    const text = message.text.trim();

    if (text === '/start' || text === '/help') {
      await send(message.chat.id, 'ArzonMarket — админ-бот\n/add — добавить товар\n/products — последние товары\n/cancel — отменить добавление');
      return response(res, 200, { ok: true });
    }
    if (text === '/cancel') {
      await drafts.deleteOne({ telegramUserId: userId });
      await send(message.chat.id, 'Добавление товара отменено.');
      return response(res, 200, { ok: true });
    }
    if (text === '/products') {
      const latest = await products.find({}, { projection: { name: 1, price: 1, stock: 1, category: 1 } }).sort({ createdAt: -1 }).limit(10).toArray();
      const summary = latest.length
        ? latest.map((product, index) => `${index + 1}. ${product.name} — ${product.price} (остаток: ${product.stock ?? 0})`).join('\n')
        : 'Товаров пока нет.';
      await send(message.chat.id, summary);
      return response(res, 200, { ok: true });
    }
    if (text === '/add') {
      await drafts.updateOne(
        { telegramUserId: userId },
        { $set: { step: STEPS[0][0], draft: {}, updatedAt: new Date() } },
        { upsert: true }
      );
      await send(message.chat.id, 'Добавление нового товара.\n' + STEPS[0][1]);
      return response(res, 200, { ok: true });
    }

    const current = await drafts.findOne({ telegramUserId: userId });
    if (!current) {
      await send(message.chat.id, 'Выбери команду /add, /products или /help.');
      return response(res, 200, { ok: true });
    }
    const index = STEPS.findIndex(([key]) => key === current.step);
    if (index < 0) {
      await drafts.deleteOne({ telegramUserId: userId });
      await send(message.chat.id, 'Состояние сброшено. Запусти /add заново.');
      return response(res, 200, { ok: true });
    }

    const [key] = STEPS[index];
    const value = text === '—' ? '' : text;
    const draft = { ...(current.draft || {}) };
    if (key === 'price' || key === 'stock') {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0 || (key === 'stock' && !Number.isInteger(number))) {
        await send(message.chat.id, key === 'price' ? 'Цена должна быть числом не меньше нуля. Попробуй ещё раз:' : 'Количество должно быть целым числом от нуля. Попробуй ещё раз:');
        return response(res, 200, { ok: true });
      }
      draft[key] = number;
    } else if (key === 'image') {
      if (value && !/^https:\/\//i.test(value)) {
        await send(message.chat.id, 'Нужна HTTPS-ссылка на фото или отправь —:');
        return response(res, 200, { ok: true });
      }
      draft.images = value ? [value] : [];
    } else {
      draft[key] = value;
    }

    if (index < STEPS.length - 1) {
      const [nextKey, prompt] = STEPS[index + 1];
      await drafts.updateOne(
        { telegramUserId: userId },
        { $set: { step: nextKey, draft, updatedAt: new Date() } },
        { upsert: true }
      );
      await send(message.chat.id, prompt);
      return response(res, 200, { ok: true });
    }

    if (!draft.name || !draft.brand || !draft.category) {
      await drafts.deleteOne({ telegramUserId: userId });
      await send(message.chat.id, 'Не хватает названия, бренда или категории. Запусти /add заново.');
      return response(res, 200, { ok: true });
    }

    const product = {
      name: String(draft.name).slice(0, 180),
      description: String(draft.description || '').slice(0, 5000),
      price: draft.price,
      oldPrice: null,
      category: String(draft.category).slice(0, 80),
      brand: String(draft.brand).slice(0, 80),
      images: draft.images || [],
      specs: [],
      featured: false,
      stock: draft.stock,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const inserted = await products.insertOne(product);
    await drafts.deleteOne({ telegramUserId: userId });
    await send(message.chat.id, `✅ Товар добавлен в базу!\nНазвание: ${product.name}\nЦена: ${product.price}\nКатегория: ${product.category}\nОстаток: ${product.stock}\nID: ${inserted.insertedId}`);
    return response(res, 200, { ok: true });
  } catch (error) {
    console.error('ArzonMarket Telegram webhook error:', error);
    return response(res, 500, { ok: false, message: 'Internal server error' });
  }
}
