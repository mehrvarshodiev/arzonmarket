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

async function send(chatId, text, extra = {}) {
  return telegram("sendMessage", { chat_id: chatId, text, ...extra });
}
async function answerCallback(callbackQueryId, text) {
  return telegram("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}
async function getProduct(id) {
  const rows = await supabase(`products?id=eq.${encodeURIComponent(id)}&select=id,name,brand,category,price,stock,description,images,is_active,featured&limit=1`);
  return rows?.[0] || null;
}
async function patchProduct(id, patch) {
  return supabase(`products?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
}
async function deleteProduct(id) {
  return supabase(`products?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" }
  });
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
    const callback = update.callback_query;
    const actorId = callback?.from?.id ?? message?.from?.id;
    const chatId = callback?.message?.chat?.id ?? message?.chat?.id;
    if (!chatId || !actorId) return reply(res, { ok: true });

    const admins = (env("TELEGRAM_ADMIN_IDS") || "")
      .split(",").map(v => v.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
    const userId = String(actorId);
    const username = String(callback?.from?.username ?? message?.from?.username ?? "").toLowerCase();
    if (!admins.includes(userId) && (!username || !admins.includes(username))) {
      await send(chatId, "⛔ Этот бот доступен только администратору магазина. Проверь TELEGRAM_ADMIN_IDS в настройках Vercel.");
      return reply(res, { ok: true });
    }

    if (callback) {
      const [action, id] = String(callback.data || "").split(":");
      if (action === "confirmdelete" && id) {
        const product = await getProduct(id);
        if (!product) {
          await answerCallback(callback.id, "Товар не найден");
          await send(chatId, "Товар не найден.");
        } else {
          await answerCallback(callback.id, "Подтверди удаление");
          await telegram("sendMessage", {
            chat_id: chatId,
            text: `Удалить «${product.name}» без возможности восстановления?`,
            reply_markup: { inline_keyboard: [[
              { text: "Да, удалить", callback_data: `delete:${id}` },
              { text: "Отмена", callback_data: "canceldelete" }
            ]] }
          });
        }
      } else if (action === "delete" && id) {
        const product = await getProduct(id);
        if (!product) {
          await answerCallback(callback.id, "Товар не найден");
          await send(chatId, "Товар не найден или уже удалён.");
        } else {
          await deleteProduct(id);
          await answerCallback(callback.id, "Товар удалён");
          await send(chatId, `🗑 Удалён товар: ${product.name}\nID: ${id}`);
        }
      } else if (action === "canceldelete") {
        await answerCallback(callback.id, "Удаление отменено");
        await send(chatId, "Удаление отменено.");
      } else if ((action === "toggleactive" || action === "featured") && id) {
        const product = await getProduct(id);
        if (!product) {
          await answerCallback(callback.id, "Товар не найден");
          await send(chatId, "Товар не найден.");
        } else {
          const patch = action === "toggleactive"
            ? { is_active: product.is_active === false }
            : { featured: !product.featured };
          await patchProduct(id, patch);
          await answerCallback(callback.id, action === "toggleactive" ? (patch.is_active ? "Товар опубликован" : "Товар скрыт") : (patch.featured ? "Добавлено в хиты" : "Убрано из хитов"));
          await send(chatId, action === "toggleactive"
            ? `${patch.is_active ? "🟢 Товар опубликован" : "⏸ Товар скрыт"}: ${product.name}`
            : `${patch.featured ? "⭐ Добавлен в хиты продаж" : "☆ Убран из хитов продаж"}: ${product.name}`);
        }
      } else if (action === "edit" && id) {
        const product = await getProduct(id);
        if (!product) {
          await answerCallback(callback.id, "Товар не найден");
          await send(chatId, "Товар не найден.");
        } else {
          await saveDraft(userId, "edit_field", { productId: id });
          await answerCallback(callback.id, "Выбери поле");
          await telegram("sendMessage", {
            chat_id: chatId,
            text: `✏️ Что изменить у товара «${product.name}»?`,
            reply_markup: { inline_keyboard: [
              [{ text: "Название", callback_data: `field:name:${id}` }, { text: "Цена", callback_data: `field:price:${id}` }],
              [{ text: "Остаток", callback_data: `field:stock:${id}` }, { text: "Категория", callback_data: `field:category:${id}` }],
              [{ text: "Описание", callback_data: `field:description:${id}` }, { text: "Фото", callback_data: `field:images:${id}` }]
            ]}
          });
        }
      } else if (action === "field") {
        const parts = String(callback.data || "").split(":");
        const field = parts[1], id = parts[2];
        const allowed = ["name", "price", "stock", "category", "description", "images"];
        if (!allowed.includes(field) || !id) {
          await answerCallback(callback.id, "Неизвестное поле");
        } else {
          await saveDraft(userId, "edit_" + field, { productId: id, field });
          await answerCallback(callback.id, "Готово");
          const prompts = { name: "Отправь новое название:", price: "Отправь новую цену числом:", stock: "Отправь новый остаток целым числом:", category: "Отправь новую категорию:", description: "Отправь новое описание:", images: "Отправляй новые фото по одному. Напиши /done, когда закончишь; текущая галерея будет заменена." };
          await send(chatId, prompts[field]);
        }
      } else {
        await answerCallback(callback.id, "Команда не распознана");
      }
      return reply(res, { ok: true });
    }
    const text = typeof message.text === "string" ? message.text.trim() : "";
    if (text === "/start" || text === "/help") {
      await send(message.chat.id, "ArzonMarket — админ-бот\n/add — добавить товар\n/products — товары и действия\n/find название — поиск товара\n/stats — сводка каталога\n/setstock ID количество — остаток\n/setprice ID цена — цена\n/show ID /hide ID — публикация товара\n/feature ID /unfeature ID — хиты продаж\n/edit ID — редактировать товар\n/delete ID — удалить товар\n/cancel — отменить действие\n/help — помощь");
      return reply(res, { ok: true });
    }
    if (text === "/done") {
      const active = await getDraft(userId);
      if (active?.step === "image") {
        const draft = active.draft || {};
        if (!draft.images?.length) {
          await send(message.chat.id, "Сначала отправь хотя бы одно фото или напиши — чтобы продолжить без фото.");
          return reply(res, { ok: true });
        }
        // The add-product flow completes below using the current draft.
      } else if (active?.step === "edit_images") {
        if (!active.draft?.images?.length) {
          await send(message.chat.id, "Отправь хотя бы одно фото или напиши /cancel, чтобы отменить.");
          return reply(res, { ok: true });
        }
        await patchProduct(active.draft.productId, { images: active.draft.images });
        await clearDraft(userId);
        await send(message.chat.id, `✅ Галерея обновлена. Фото: ${active.draft.images.length}`);
        return reply(res, { ok: true });
      } else {
        await send(message.chat.id, "Сейчас нет загрузки фото.");
        return reply(res, { ok: true });
      }
    }
    if (text === "/cancel") {
      await clearDraft(userId);
      await send(message.chat.id, "Текущее действие отменено.");
      return reply(res, { ok: true });
    }
    if (text === "/products") {
      const products = await supabase("products?select=id,name,price,stock,category,is_active,featured&order=created_at.desc&limit=10");
      if (!products.length) {
        await send(message.chat.id, "Каталог пока пуст. Добавь первый товар командой /add.");
      } else {
        for (const product of products) {
          const status = product.is_active === false ? "⏸ скрыт" : "🟢 опубликован";
          const featured = product.featured ? "⭐ хит продаж" : "";
          await telegram("sendMessage", {
            chat_id: message.chat.id,
            text: `📦 ${product.name}\nЦена: ${product.price}\nОстаток: ${product.stock ?? 0}\nКатегория: ${product.category || "—"}\nСтатус: ${status} ${featured}\nID: ${product.id}`,
            reply_markup: { inline_keyboard: [
              [{ text: "✏️ Изменить", callback_data: `edit:${product.id}` }, { text: product.is_active === false ? "🟢 Опубликовать" : "⏸ Скрыть", callback_data: `toggleactive:${product.id}` }],
              [{ text: product.featured ? "☆ Убрать из хитов" : "⭐ В хиты продаж", callback_data: `featured:${product.id}` }, { text: "🗑 Удалить", callback_data: `confirmdelete:${product.id}` }]
            ] }
          });
        }
      }
      return reply(res, { ok: true });
    }

    if (text === "/stats") {
      const products = await supabase("products?select=id,name,price,stock,is_active,featured&limit=500");
      const active = products.filter((p) => p.is_active !== false);
      const hidden = products.length - active.length;
      const low = active.filter((p) => Number(p.stock || 0) <= 3);
      const outOfStock = active.filter((p) => Number(p.stock || 0) <= 0);
      const featured = active.filter((p) => p.featured);
      const inventoryValue = active.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0), 0);
      const fmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });
      await send(message.chat.id,
        `📊 Сводка ArzonMarket\n\nВсего товаров: ${products.length}\nОпубликовано: ${active.length}\nСкрыто: ${hidden}\nХитов продаж: ${featured.length}\nМало на складе (≤3): ${low.length}\nНет в наличии: ${outOfStock.length}\nСумма остатков по розничным ценам: ${fmt.format(inventoryValue)}\n\n${low.length ? "⚠️ Проверь остатки:\n" + low.slice(0, 10).map((p) => `• ${p.name}: ${p.stock ?? 0}`).join("\n") : "✅ Критически низких остатков нет."}`
      );
      return reply(res, { ok: true });
    }

    if (text.toLowerCase().startsWith("/find ")) {
      const query = text.slice(6).trim().replace(/[,%()]/g, "").slice(0, 60);
      if (!query) {
        await send(message.chat.id, "Напиши запрос: /find iPhone");
        return reply(res, { ok: true });
      }
      const safeQuery = encodeURIComponent(query);
      const products = await supabase(`products?select=id,name,price,stock,category,is_active,featured&or=(name.ilike.*${safeQuery}*,brand.ilike.*${safeQuery}*)&order=created_at.desc&limit=10`);
      if (!products.length) await send(message.chat.id, `По запросу «${query}» ничего не найдено.`);
      else {
        for (const product of products) {
          await telegram("sendMessage", {
            chat_id: message.chat.id,
            text: `🔎 ${product.name}\nЦена: ${product.price}\nОстаток: ${product.stock ?? 0}\nID: ${product.id}`,
            reply_markup: { inline_keyboard: [
              [{ text: "✏️ Изменить", callback_data: `edit:${product.id}` }, { text: product.is_active === false ? "🟢 Опубликовать" : "⏸ Скрыть", callback_data: `toggleactive:${product.id}` }],
              [{ text: product.featured ? "☆ Убрать из хитов" : "⭐ В хиты продаж", callback_data: `featured:${product.id}` }, { text: "🗑 Удалить", callback_data: `confirmdelete:${product.id}` }]
            ] }
          });
        }
      }
      return reply(res, { ok: true });
    }

    const quickMatch = text.match(/^\/(setstock|setprice|show|hide|feature|unfeature)\s+([0-9a-f-]{36})(?:\s+([0-9]+(?:\.[0-9]+)?))?$/i);
    if (quickMatch) {
      const [, rawAction, id, rawValue] = quickMatch;
      const action = rawAction.toLowerCase();
      const product = await getProduct(id);
      if (!product) {
        await send(message.chat.id, "Товар не найден. Открой /products и скопируй ID товара.");
        return reply(res, { ok: true });
      }
      let patch;
      if (action === "setstock" || action === "setprice") {
        if (rawValue === undefined) {
          await send(message.chat.id, action === "setstock" ? "Формат: /setstock ID количество" : "Формат: /setprice ID цена");
          return reply(res, { ok: true });
        }
        const value = Number(rawValue);
        if (!Number.isFinite(value) || value < 0 || (action === "setstock" && !Number.isInteger(value))) {
          await send(message.chat.id, action === "setstock" ? "Остаток должен быть целым числом ≥ 0." : "Цена должна быть числом ≥ 0.");
          return reply(res, { ok: true });
        }
        patch = action === "setstock" ? { stock: value } : { price: value };
      } else if (action === "show" || action === "hide") {
        patch = { is_active: action === "show" };
      } else {
        patch = { featured: action === "feature" };
      }
      await patchProduct(id, patch);
      const labels = { setstock: `Остаток обновлён: ${patch.stock}`, setprice: `Цена обновлена: ${patch.price}`, show: "Товар опубликован на сайте.", hide: "Товар скрыт с сайта.", feature: "Товар добавлен в хиты продаж.", unfeature: "Товар убран из хитов продаж." };
      await send(message.chat.id, `✅ ${labels[action]}\n${product.name}`);
      return reply(res, { ok: true });
    }
    const commandMatch = text.match(new RegExp("^/(edit|delete)\\s+([0-9a-f-]{36})$", "i"));
    if (commandMatch) {
      const [, command, id] = commandMatch;
      const product = await getProduct(id);
      if (!product) await send(message.chat.id, "Товар не найден. Используй /products, чтобы получить список.");
      else if (command.toLowerCase() === "edit") {
        await saveDraft(userId, "edit_field", { productId: id });
        await telegram("sendMessage", { chat_id: message.chat.id, text: `Выбери поле для «${product.name}»:`, reply_markup: { inline_keyboard: [
          [{ text: "Название", callback_data: `field:name:${id}` }, { text: "Цена", callback_data: `field:price:${id}` }],
          [{ text: "Остаток", callback_data: `field:stock:${id}` }, { text: "Категория", callback_data: `field:category:${id}` }],
          [{ text: "Описание", callback_data: `field:description:${id}` }, { text: "Фото", callback_data: `field:images:${id}` }]
        ] } });
      } else {
        await telegram("sendMessage", { chat_id: message.chat.id, text: `Удалить «${product.name}» без возможности восстановления?`, reply_markup: { inline_keyboard: [[{ text: "Да, удалить", callback_data: `delete:${id}` }, { text: "Отмена", callback_data: "canceldelete" }]] } });
      }
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
    if (current.step?.startsWith("edit_")) {
      const draft = { ...(current.draft || {}) };
      const field = current.step.slice(5);
      if (field === "images") {
        if (text === "/done") {
          if (!draft.images?.length) { await send(message.chat.id, "Отправь фото или /cancel."); return reply(res, { ok: true }); }
          await patchProduct(draft.productId, { images: draft.images });
          await clearDraft(userId);
          await send(message.chat.id, `✅ Галерея товара обновлена: ${draft.images.length} фото.`);
          return reply(res, { ok: true });
        }
        let imageUrl = "";
        try {
          if (message.photo?.length) imageUrl = await saveTelegramPhoto(message.photo);
          else if (message.document?.mime_type?.startsWith("image/")) imageUrl = await saveTelegramPhoto([{ file_id: message.document.file_id, file_size: message.document.file_size }]);
          else if (text.startsWith("https://")) imageUrl = await saveImageFromUrl(text);
          else { await send(message.chat.id, "Отправь фото/HTTPS-ссылку или /done."); return reply(res, { ok: true }); }
        } catch (error) { await send(message.chat.id, "Не удалось сохранить фото: " + error.message); return reply(res, { ok: true }); }
        draft.images = [...(draft.images || []), imageUrl].slice(0, 10);
        await saveDraft(userId, current.step, draft);
        await send(message.chat.id, `Фото добавлено (${draft.images.length}/10). Отправь ещё или /done.`);
        return reply(res, { ok: true });
      }
      if (typeof message.text !== "string") { await send(message.chat.id, "Отправь новое значение текстом."); return reply(res, { ok: true }); }
      const value = text === "—" ? "" : text;
      let patch = {};
      if (field === "price" || field === "stock") {
        const number = Number(value);
        if (!Number.isFinite(number) || number < 0 || (field === "stock" && !Number.isInteger(number))) {
          await send(message.chat.id, field === "price" ? "Цена должна быть числом ≥ 0." : "Остаток должен быть целым числом ≥ 0.");
          return reply(res, { ok: true });
        }
        patch[field] = number;
      } else patch[field] = value.slice(0, field === "description" ? 5000 : 180);
      await patchProduct(draft.productId, patch);
      await clearDraft(userId);
      await send(message.chat.id, "✅ Товар обновлён.");
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
      // /done завершает шаг фото, а не считается некорректной ссылкой.
      if (text === "/done") {
        if (!draft.images?.length) {
          await send(message.chat.id, "Сначала отправь хотя бы одно фото или отправь — если товар без фото.");
          return reply(res, { ok: true });
        }
      } else if (message.photo?.length) {
        try {
          draft.images = [...(draft.images || []), await saveTelegramPhoto(message.photo)].slice(0, 10);
        } catch (error) {
          console.error("Telegram product photo error:", error);
          await send(message.chat.id, "Не удалось сохранить фото. Попробуй отправить изображение как фото (не файл) размером до 8 МБ ещё раз, или отправь HTTPS-ссылку.");
          return reply(res, { ok: true });
        }
      } else if (message.document?.mime_type?.startsWith("image/")) {
        try {
          draft.images = [...(draft.images || []), await saveTelegramPhoto([{ file_id: message.document.file_id, file_unique_id: message.document.file_unique_id, file_size: message.document.file_size }])].slice(0, 10);
        } catch (error) {
          console.error("Telegram product image document error:", error);
          await send(message.chat.id, "Не удалось сохранить изображение. Попробуй отправить его как фото размером до 8 МБ.");
          return reply(res, { ok: true });
        }
      } else {
        const value = text === "—" ? "" : text;
        if (value && !value.startsWith("https://")) {
          await send(message.chat.id, "Отправь фото из галереи/файлов, прямую HTTPS-ссылку, /done после загрузки фото или — если без фото:");
          return reply(res, { ok: true });
        }
        if (value) {
          try {
            draft.images = [...(draft.images || []), await saveImageFromUrl(value)].slice(0, 10);
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

    if (key === "image" && text !== "/done" && (message.photo?.length || message.document?.mime_type?.startsWith("image/") || text.startsWith("https://"))) {
      await saveDraft(userId, "image", draft);
      await send(message.chat.id, `📸 Фото сохранено (${draft.images?.length || 0}/10). Отправь ещё одно фото или /done для завершения.`);
      return reply(res, { ok: true });
    }
    if (index < STEPS.length - 1) {
      const [nextKey, prompt] = STEPS[index + 1];
      await saveDraft(userId, nextKey, draft);
      await send(message.chat.id, nextKey === "image" ? prompt + "\\nМожно отправить до 10 фото по одному. После всех фото напиши /done." : prompt);
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
