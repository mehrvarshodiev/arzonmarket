const reply = (res, data, status = 200) => res.status(status).json(data);

const env = (name) => globalThis.process?.env?.[name];

async function supabase(path, options = {}) {
  const base = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new Error("Supabase environment variables are missing");
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

async function telegram(method, payload) {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return data.result;
}

async function send(chatId, text) {
  return telegram("sendMessage", { chat_id: chatId, text, reply_markup: { remove_keyboard: true } });
}

async function saveDraft(userId, step, draft) {
  return supabase("telegram_product_drafts?on_conflict=telegram_user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ telegram_user_id: userId, step, draft, updated_at: new Date().toISOString() })
  });
}

async function getDraft(userId) {
  const rows = await supabase(`telegram_product_drafts?telegram_user_id=eq.${userId}&select=step,draft&limit=1`);
  return rows?.[0] || null;
}

async function clearDraft(userId) {
  return supabase(`telegram_product_drafts?telegram_user_id=eq.${userId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}

const STEPS = [
  ["name", "Напиши название товара:"],
  ["brand", "Напиши бренд или производителя:"],
  ["category", "Напиши категорию (например, Телефоны):"],
  ["price", "Напиши цену числом:"],
  ["stock", "Напиши количество на складе:"],
  ["description", "Напиши описание товара или отправь — если без описания:"],
  ["image", "Отправь прямую HTTPS-ссылку на фото товара или напиши — если без фото:"]
];

export default async function handler(req, res) {
  if (req.method !== "POST") return reply(res, { ok: false, message: "Method not allowed" }, 405);
  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return reply(res, { ok: false, message: "Unauthorized" }, 401);
  }

  try {
    const update = req.body || {};
    const message = update.message;
    if (!message?.chat?.id || !message?.from?.id || typeof message.text !== "string") return reply(res, { ok: true });
    const admins = (env("TELEGRAM_ADMIN_IDS") || "").split(",").map(v => v.trim()).filter(Boolean);
    const userId = String(message.from.id);
    if (!admins.includes(userId)) {
      await send(message.chat.id, "⛔ Этот бот доступен только администратору магазина.");
      return reply(res, { ok: true });
    }

    const text = message.text.trim();
    if (text === "/start" || text === "/help") {
      await send(message.chat.id, "ArzonMarket — админ-бот\n/add — добавить товар\n/cancel — отменить добавление\n/products — последние товары");
      return reply(res, { ok: true });
    }
    if (text === "/cancel") {
      await clearDraft(userId);
      await send(message.chat.id, "Добавление товара отменено.");
      return reply(res, { ok: true });
    }
    if (text === "/products") {
      const products = await supabase("products?select=name,price,stock,category&order=created_at.desc&limit=10");
      const summary = products.length ? products.map((p, i) => `${i + 1}. ${p.name} — ${p.price} (остаток: ${p.stock})`).join("\n") : "Товаров пока нет.";
      await send(message.chat.id, summary);
      return reply(res, { ok: true });
    }
    if (text === "/add") {
      await saveDraft(userId, STEPS[0][0], {});
      await send(message.chat.id, "Добавление нового товара.\n" + STEPS[0][1]);
      return reply(res, { ok: true });
    }

    const current = await getDraft(userId);
    if (!current) {
      await send(message.chat.id, "Выбери команду /add, /products или /help.");
      return reply(res, { ok: true });
    }
    const index = STEPS.findIndex(([key]) => key === current.step);
    const [key] = STEPS[index];
    const value = text === "—" ? "" : text;
    const draft = { ...(current.draft || {}) };

    if (key === "price" || key === "stock") {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0 || (key === "stock" && !Number.isInteger(number))) {
        await send(message.chat.id, key === "price" ? "Цена должна быть числом не меньше нуля. Попробуй ещё раз:" : "Количество должно быть целым числом от нуля. Попробуй ещё раз:");
        return reply(res, { ok: true });
      }
      draft[key] = number;
    } else if (key === "image") {
      if (value && !/^https:\/\//i.test(value)) {
        await send(message.chat.id, "Нужна прямая HTTPS-ссылка на фото или отправь —:");
        return reply(res, { ok: true });
      }
      draft.images = value ? [value] : [];
    } else {
      draft[key] = value;
    }

    if (index < STEPS.length - 1) {
      const [nextKey, prompt] = STEPS[index + 1];
      await saveDraft(userId, nextKey, draft);
      await send(message.chat.id, prompt);
      return reply(res, { ok: true });
    }

    if (!draft.name || !draft.brand || !draft.category) {
      await clearDraft(userId);
      await send(message.chat.id, "Не хватает названия, бренда или категории. Запусти /add заново.");
      return reply(res, { ok: true });
    }
    const rows = await supabase("products?select=id", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name: draft.name.slice(0, 180),
        brand: draft.brand.slice(0, 80),
        category: draft.category.slice(0, 80),
        price: draft.price,
        stock: draft.stock,
        description: (draft.description || "").slice(0, 5000),
        images: draft.images || [],
        specs: [],
        featured: false,
        is_active: true,
        updated_at: new Date().toISOString()
      })
    });
    await clearDraft(userId);
    await send(message.chat.id, `✅ Товар добавлен в Supabase!\nНазвание: ${draft.name}\nЦена: ${draft.price}\nКатегория: ${draft.category}\nОстаток: ${draft.stock}\nID: ${rows?.[0]?.id || "сохранён"}`);
    return reply(res, { ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return reply(res, { ok: false, message: "Internal server error" }, 500);
  }
}
