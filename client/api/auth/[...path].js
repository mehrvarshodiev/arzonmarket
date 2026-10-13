import crypto from "node:crypto";

const env = (name) => process.env[name];
const reply = (res, status, payload) => res.status(status).json(payload);

function verifyTelegramLogin(data, botToken) {
  if (!data || typeof data !== "object" || !botToken || !/^[a-f0-9]{64}$/i.test(String(data.hash || ""))) return false;
  const authDate = Number(data.auth_date);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(authDate) || authDate > now + 60 || now - authDate > 86400) return false;
  const { hash, ...fields } = data;
  const checkString = Object.keys(fields).filter(key => fields[key] !== undefined && fields[key] !== null)
    .sort().map(key => `${key}=${fields[key]}`).join("\n");
  const secret = crypto.createHash("sha256").update(botToken).digest();
  const expected = crypto.createHmac("sha256", secret).update(checkString).digest();
  const supplied = Buffer.from(String(hash), "hex");
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
}

function issueToken(user) {
  const secret = env("JWT_SECRET");
  if (!secret) throw new Error("JWT_SECRET is not configured");
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ sub: user.id, role: user.role, name: user.name, iat: now, exp: now + 7 * 86400 });
  const unsigned = `${header}.${payload}`;
  const signature = crypto.createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

async function supabase(path, options = {}) {
  const base = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new Error("Supabase server credentials are not configured");
  const response = await fetch(`${base.replace(/\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`Supabase request failed (${response.status}): ${text.slice(0, 180)}`);
    error.status = response.status;
    throw error;
  }
  return text ? JSON.parse(text) : [];
}

async function customerTelegram(method) {
  const token = env("TELEGRAM_CUSTOMER_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_CUSTOMER_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`);
  const data = await response.json();
  if (!response.ok || !data.ok || !data.result?.username) throw new Error("Customer Telegram bot configuration could not be loaded");
  return data.result;
}

export default async function handler(req, res) {
  const segments = Array.isArray(req.query?.path)
    ? req.query.path.map(String)
    : new URL(req.url || "/", "https://arzonmarket.local").pathname.split("/").filter(Boolean).slice(2);
  const route = segments.join("/").replace(/\/$/, "");

  if (req.method === "GET" && route === "telegram/config") {
    try {
      const configured = String(env("TELEGRAM_CUSTOMER_BOT_USERNAME") || "").trim().replace(/^@/, "");
      if (configured) {
        if (!env("TELEGRAM_CUSTOMER_BOT_TOKEN")) {
          return reply(res, 503, { message: "Вход покупателей пока не настроен: добавьте TELEGRAM_CUSTOMER_BOT_TOKEN в Vercel. Админ-бот для входа не используется." });
        }
        return reply(res, 200, { username: configured });
      }
      const bot = await customerTelegram("getMe");
      return reply(res, 200, { username: bot.username });
    } catch (error) {
      console.error("Customer Telegram login config:", error.message);
      return reply(res, 503, { message: "Создайте отдельного Telegram-бота для покупателей и добавьте TELEGRAM_CUSTOMER_BOT_TOKEN и TELEGRAM_CUSTOMER_BOT_USERNAME в Vercel. Админ-бот не используется для входа." });
    }
  }

  if (req.method === "POST" && route === "telegram") {
    try {
      const data = req.body || {};
      const customerBotToken = env("TELEGRAM_CUSTOMER_BOT_TOKEN");
      if (!customerBotToken) {
        return reply(res, 503, { message: "Вход покупателей ещё не настроен. Нужен отдельный Telegram-бот для входа." });
      }
      if (!verifyTelegramLogin(data, customerBotToken)) {
        return reply(res, 401, { message: "Данные Telegram не прошли проверку для бота входа покупателей. Обновите страницу и попробуйте снова." });
      }
      const telegramId = String(data.id || "");
      if (!/^\d{1,20}$/.test(telegramId)) return reply(res, 400, { message: "Telegram вернул некорректный идентификатор." });
      const name = [data.first_name, data.last_name].filter(Boolean).map(v => String(v).trim()).join(" ").slice(0, 120) || "Покупатель";
      const lookup = await supabase(`users?telegram_id=eq.${encodeURIComponent(telegramId)}&select=id,phone,telegram_id,name,role&limit=1`);
      let user = lookup[0];
      if (user) {
        const updated = await supabase(`users?id=eq.${encodeURIComponent(user.id)}&select=id,phone,telegram_id,name,role`, {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ name, updated_at: new Date().toISOString() })
        });
        user = updated[0] || { ...user, name };
      } else {
        const created = await supabase("users?select=id,phone,telegram_id,name,role", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ telegram_id: telegramId, name, role: "customer" })
        });
        user = created[0];
      }
      if (!user?.id) throw new Error("Could not create or retrieve the customer profile");
      return reply(res, 200, {
        token: issueToken(user),
        user: { id: user.id, phone: user.phone || null, name: user.name, role: user.role || "customer", telegramId: user.telegram_id }
      });
    } catch (error) {
      console.error("Telegram login failed:", error.message);
      if (error.status === 401 || error.status === 403) return reply(res, 503, { message: "Нет доступа к базе покупателей. Проверьте настройки Supabase." });
      if (error.message === "JWT_SECRET is not configured") return reply(res, 503, { message: "На сервере не настроен JWT_SECRET. Проверьте переменные Vercel." });
      return reply(res, 500, { message: "Не удалось создать профиль. Проверьте настройки базы данных и попробуйте ещё раз." });
    }
  }

  if (req.method !== "GET" && req.method !== "POST") res.setHeader("Allow", "GET, POST");
  return reply(res, 404, { message: "Маршрут авторизации не найден." });
}
