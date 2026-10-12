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

function imageType(bytes, declaredType = "", sourcePath = "") {
  const raw = new Uint8Array(bytes);
  const declared = String(declaredType).split(";")[0].trim().toLowerCase();
  const signatures = [
    { ok: raw[0] === 0xff && raw[1] === 0xd8 && raw[2] === 0xff, type: "image/jpeg", ext: "jpg" },
    { ok: raw[0] === 0x89 && raw[1] === 0x50 && raw[2] === 0x4e && raw[3] === 0x47, type: "image/png", ext: "png" },
    { ok: raw[0] === 0x52 && raw[1] === 0x49 && raw[2] === 0x46 && raw[3] === 0x46 && String.fromCharCode(...raw.slice(8, 12)) === "WEBP", type: "image/webp", ext: "webp" },
    { ok: String.fromCharCode(...raw.slice(0, 3)) === "GIF", type: "image/gif", ext: "gif" }
  ];
  const found = signatures.find((item) => item.ok);
  if (found) return found;
  const known = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif", "image/bmp": "bmp" };
  if (declared.startsWith("image/") && known[declared]) return { type: declared, ext: known[declared] };
  const match = String(sourcePath).toLowerCase().match(/\.(jpe?g|png|webp|gif|avif|bmp)(?:$|[?#])/);
  if (match) {
    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    return { type: ext === "jpg" ? "image/jpeg" : "image/" + ext, ext };
  }
  throw new Error("Ссылка не ведёт напрямую на изображение. Отправь прямую HTTPS-ссылку на JPG, PNG или WEBP.");
}

async function ensurePublicImageBucket() {
  const base = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(base + "/storage/v1/bucket/product-images", {
    method: "PUT",
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ public: true })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Не удалось открыть публичный доступ к product-images (" + response.status + "): " + detail.slice(0, 180));
  }
}

async function storeProductImage(bytes, declaredType, sourcePath = "") {
  if (!bytes || !bytes.byteLength || bytes.byteLength > 8 * 1024 * 1024) {
    throw new Error("Фото должно быть меньше 8 МБ");
  }
  const base = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const detected = imageType(bytes, declaredType, sourcePath);
  await ensurePublicImageBucket();
  const objectPath = "telegram-products/" + Date.now() + "-" + Math.random().toString(36).slice(2, 10) + "." + detected.ext;
  const upload = await fetch(base + "/storage/v1/object/product-images/" + objectPath, {
    method: "POST",
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": detected.type, "x-upsert": "true" },
    body: bytes
  });
  if (!upload.ok) {
    const detail = await upload.text();
    throw new Error("Supabase photo upload failed (" + upload.status + "): " + detail.slice(0, 200));
  }
  return base + "/storage/v1/object/public/product-images/" + objectPath;
}

async function saveTelegramPhoto(photoSizes) {
  const token = env("TELEGRAM_BOT_TOKEN");
  const photo = [...photoSizes].sort((a, b) => (b.file_size || 0) - (a.file_size || 0))[0];
  if (!photo || !photo.file_id) throw new Error("Telegram photo has no file_id");
  const fileInfo = await telegram("getFile", { file_id: photo.file_id });
  if (!fileInfo.file_path) throw new Error("Telegram did not return a file path");
  const downloaded = await fetch("https://api.telegram.org/file/bot" + token + "/" + fileInfo.file_path);
  if (!downloaded.ok) throw new Error("Не удалось скачать изображение из Telegram");
  const bytes = await downloaded.arrayBuffer();
  return storeProductImage(bytes, downloaded.headers.get("content-type") || "", fileInfo.file_path);
}

async function saveImageFromUrl(imageUrl) {
  let parsed;
  try { parsed = new URL(imageUrl); } catch { throw new Error("Неверная ссылка на изображение"); }
  if (parsed.protocol !== "https:") throw new Error("Для изображения нужна HTTPS-ссылка");
  const downloaded = await fetch(parsed.toString(), { redirect: "follow" });
  if (!downloaded.ok) throw new Error("Не удалось открыть ссылку на фото (" + downloaded.status + ")");
  const type = downloaded.headers.get("content-type") || "";
  if (!type.toLowerCase().startsWith("image/") && !/\.(jpe?g|png|webp|gif|avif|bmp)(?:$|[?#])/i.test(parsed.pathname + parsed.search)) {
    throw new Error("Ссылка открывает страницу, а не сам файл изображения. Нужна прямая HTTPS-ссылка на картинку.");
  }
  const bytes = await downloaded.arrayBuffer();
  return storeProductImage(bytes, type, parsed.pathname + parsed.search);
}

const STEPS = [
  ["name", "Напиши название товара:"],
  ["brand", "Напиши бренд или производителя:"],
  ["category", "Напиши категорию (например, Телефоны):"],
  ["price", "Напиши цену числом:"],
  ["stock", "Напиши количество на складе:"],
  ["description", "Напиши описание товара или отправь — если без описания:"],
  ["image", "Отправь фото товара прямо из телефона/ноутбука как фото в Telegram. Можно также отправить документ-изображение или HTTPS-ссылку. Если без фото — отправь —:"]
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
    if (!message?.chat?.id || !message?.from?.id) return reply(res, { ok: true });

    const admins = (env("TELEGRAM_ADMIN_IDS") || "").split(",").map(v => v.trim()).filter(Boolean);
    const userId = String(message.from.id);
    if (!admins.includes(userId)) {
      await send(message.chat.id, "⛔ Этот бот доступен только администратору магазина.");
      return reply(res, { ok: true });
    }

    const text = typeof message.text === "string" ? message.text.trim() : "";
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
    if (index < 0) {
      await clearDraft(userId);
      await send(message.chat.id, "Состояние добавления сброшено. Запусти /add заново.");
      return reply(res, { ok: true });
    }
    const [key] = STEPS[index];
    const draft = { ...(current.draft || {}) };

    if (key === "image") {
      if (message.photo?.length) {
        try {
          draft.images = [await saveTelegramPhoto(message.photo)];
        } catch (error) {
          console.error("Telegram product photo error:", error);
          await send(message.chat.id, "Не удалось сохранить фото. Попробуй отправить изображение как фото (не файл) размером до 8 МБ ещё раз, или отправь HTTPS-ссылку.");
          return reply(res, { ok: true });
        }
      } else if (message.document?.mime_type?.startsWith("image/")) {
        try {
          draft.images = [await saveTelegramPhoto([{ file_id: message.document.file_id, file_unique_id: message.document.file_unique_id, file_size: message.document.file_size }])];
        } catch (error) {
          console.error("Telegram product image document error:", error);
          await send(message.chat.id, "Не удалось сохранить изображение. Попробуй отправить его как фото размером до 8 МБ.");
          return reply(res, { ok: true });
        }
      } else {
        const value = text === "—" ? "" : text;
        if (value && !/^https:\/\//i.test(value)) {
          await send(message.chat.id, "Отправь фото из галереи/файлов, прямую HTTPS-ссылку или — если без фото:");
          return reply(res, { ok: true });
        }
        if (value) {
          try {
            draft.images = [await saveImageFromUrl(value)];
          } catch (error) {
            console.error("Telegram product image URL error:", error);
            await send(message.chat.id, "Не удалось сохранить картинку по ссылке. " + (error.message || "Проверь ссылку и попробуй ещё раз."));
            return reply(res, { ok: true });
          }
        } else {
          draft.images = [];
        }
      }
    } else {
      if (typeof message.text !== "string") {
        await send(message.chat.id, "Пожалуйста, отправь ответ текстом.\n" + STEPS[index][1]);
        return reply(res, { ok: true });
      }
      const value = text === "—" ? "" : text;
      if (key === "price" || key === "stock") {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || (key === "stock" && !Number.isInteger(number))) {
          await send(message.chat.id, key === "price" ? "Цена должна быть числом не меньше нуля. Попробуй ещё раз:" : "Количество должно быть целым числом от нуля. Попробуй ещё раз:");
          return reply(res, { ok: true });
        }
        draft[key] = number;
      } else {
        draft[key] = value;
      }
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
    await send(message.chat.id, `✅ Товар добавлен в Supabase!\nНазвание: ${draft.name}\nЦена: ${draft.price}\nКатегория: ${draft.category}\nОстаток: ${draft.stock}\nФото: ${draft.images?.length ? "сохранено в Supabase Storage" : "без фото"}\nID: ${rows?.[0]?.id || "сохранён"}`);
    return reply(res, { ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return reply(res, { ok: false, message: "Internal server error" }, 500);
  }
}
