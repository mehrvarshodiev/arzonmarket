import crypto from "node:crypto";

const env = (name) => process.env[name];
const reply = (res, status, payload) => res.status(status).json(payload);

function hashToken(value) { return crypto.createHash("sha256").update(String(value)).digest("hex"); }

function adminTelegramIds() {
  return new Set(String(env("TELEGRAM_ADMIN_IDS") || "").split(",").map(v => v.trim()).filter(v => /^\d+$/.test(v)));
}

async function getAdminBotInfo() {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await response.json();
  if (!response.ok || !data.ok || !data.result?.username) throw new Error("Admin Telegram bot configuration could not be loaded");
  return data.result;
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


export default async function handler(req, res) {
  const segments = Array.isArray(req.query?.path)
    ? req.query.path.map(String)
    : new URL(req.url || "/", "https://arzonmarket.local").pathname.split("/").filter(Boolean).slice(2);
  const route = segments.join("/").replace(/\/$/, "");

  if (req.method === "POST" && route === "telegram/challenge") {
    try {
      const bot = await getAdminBotInfo();
      const challengeToken = crypto.randomBytes(32).toString("hex");
      const pollToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const rows = await supabase("telegram_login_challenges?select=id", {
        method: "POST", headers: { Prefer: "return=representation" },
        body: JSON.stringify({ token_hash: hashToken(challengeToken), poll_token_hash: hashToken(pollToken), status: "pending", expires_at: expiresAt })
      });
      const challenge = rows[0];
      if (!challenge?.id) throw new Error("Could not create Telegram login challenge");
      return reply(res, 200, { challengeId: challenge.id, pollToken, expiresAt, deepLink: `https://t.me/${bot.username}?start=login_${challengeToken}` });
    } catch (error) {
      console.error("Telegram login challenge failed:", error.message);
      return reply(res, 503, { message: "Не удалось начать вход через Telegram. Проверьте настройки сервера и таблицу авторизации." });
    }
  }

  if (req.method === "GET" && route === "telegram/poll") {
    try {
      const challengeId = String(req.query?.id || "");
      const pollToken = String(req.query?.token || "");
      if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^[a-f0-9]{64}$/i.test(pollToken)) return reply(res, 400, { message: "Некорректный запрос авторизации." });
      const rows = await supabase(`telegram_login_challenges?id=eq.${encodeURIComponent(challengeId)}&poll_token_hash=eq.${hashToken(pollToken)}&select=id,status,telegram_id,telegram_name,expires_at&limit=1`);
      const challenge = rows[0];
      if (!challenge) return reply(res, 404, { message: "Сессия входа не найдена. Начните заново." });
      if (challenge.status === "pending" && Date.parse(challenge.expires_at) <= Date.now()) {
        await supabase(`telegram_login_challenges?id=eq.${encodeURIComponent(challenge.id)}&status=eq.pending`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "expired" }) });
        return reply(res, 410, { message: "Время входа истекло. Попробуйте снова." });
      }
      if (challenge.status !== "confirmed" || !challenge.telegram_id) return reply(res, 202, { status: challenge.status });
      const telegramId = String(challenge.telegram_id);
      if (!/^\d{1,20}$/.test(telegramId)) return reply(res, 400, { message: "Некорректный Telegram ID." });
      const role = adminTelegramIds().has(telegramId) ? "admin" : "customer";
      const name = String(challenge.telegram_name || "Покупатель").slice(0, 120);
      const lookup = await supabase(`users?telegram_id=eq.${encodeURIComponent(telegramId)}&select=id,phone,telegram_id,name,role&limit=1`);
      let user = lookup[0];
      if (user) {
        const updated = await supabase(`users?id=eq.${encodeURIComponent(user.id)}&select=id,phone,telegram_id,name,role`, {
          method: "PATCH", headers: { Prefer: "return=representation" },
          body: JSON.stringify({ name, role, updated_at: new Date().toISOString() })
        });
        user = updated[0] || { ...user, name, role };
      } else {
        const created = await supabase("users?select=id,phone,telegram_id,name,role", {
          method: "POST", headers: { Prefer: "return=representation" },
          body: JSON.stringify({ telegram_id: telegramId, name, role })
        });
        user = created[0];
      }
      if (!user?.id) throw new Error("Could not create or retrieve Telegram profile");
      await supabase(`telegram_login_challenges?id=eq.${encodeURIComponent(challenge.id)}&status=eq.confirmed`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "consumed", consumed_at: new Date().toISOString() })
      });
      return reply(res, 200, { token: issueToken({ ...user, role }), user: { id: user.id, phone: user.phone || null, name: user.name, role, telegramId: user.telegram_id } });
    } catch (error) {
      console.error("Telegram login poll failed:", error.message);
      if (error.status === 401 || error.status === 403) return reply(res, 503, { message: "Нет доступа к базе покупателей. Проверьте настройки Supabase." });
      if (error.message === "JWT_SECRET is not configured") return reply(res, 503, { message: "На сервере не настроен JWT_SECRET." });
      return reply(res, 500, { message: "Не удалось завершить вход. Попробуйте ещё раз." });
    }
  }

  if (req.method !== "GET" && req.method !== "POST") res.setHeader("Allow", "GET, POST");
  return reply(res, 404, { message: "Маршрут авторизации не найден." });
}
