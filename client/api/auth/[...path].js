import crypto from "node:crypto";

const env = (name) => process.env[name];
const reply = (res, status, payload) => res.status(status).json(payload);
const hashToken = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

function adminTelegramIds() {
  return new Set(String(env("TELEGRAM_ADMIN_IDS") || "").split(",").map(v => v.trim()).filter(v => /^\\d+$/.test(v)));
}
async function getAdminBotInfo() {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await response.json();
  if (!response.ok || !data.ok || !data.result?.username) throw new Error("Telegram bot configuration could not be loaded");
  return data.result;
}
async function supabase(path, options = {}) {
  const base = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new Error("Supabase server credentials are not configured");
  const response = await fetch(`${base.replace(/\\/$/, "")}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      Accept: "application/json", ...(options.headers || {})
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
function userView(user) {
  return {
    id: user.id, phone: user.phone || null, name: user.name || "Покупатель",
    role: user.role || "customer", telegramId: user.telegram_id || null,
    username: user.telegram_username || null, photoUrl: user.telegram_photo_url || null,
    firstName: user.telegram_first_name || null, lastName: user.telegram_last_name || null
  };
}
async function upsertTelegramUser(data) {
  const telegramId = String(data.id);
  const isAdmin = adminTelegramIds().has(telegramId);
  const firstName = String(data.first_name || "").trim().slice(0, 120);
  const lastName = String(data.last_name || "").trim().slice(0, 120);
  const username = String(data.username || "").trim().replace(/^@/, "").slice(0, 64) || null;
  const photoUrl = typeof data.photo_url === "string" && data.photo_url.startsWith("https://")
    ? data.photo_url.slice(0, 2048) : null;
  const name = [firstName, lastName].filter(Boolean).join(" ").slice(0, 240) || (username ? `@${username}` : "Покупатель");
  const rows = await supabase(
    "users?on_conflict=telegram_id&select=id,phone,telegram_id,name,role,telegram_username,telegram_photo_url,telegram_first_name,telegram_last_name",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({
        telegram_id: telegramId, name, role: isAdmin ? "admin" : "customer",
        telegram_username: username, telegram_photo_url: photoUrl,
        telegram_first_name: firstName || null, telegram_last_name: lastName || null,
        updated_at: new Date().toISOString()
      })
    }
  );
  if (!rows[0]?.id) throw new Error("Could not create or retrieve Telegram profile");
  return rows[0];
}
async function createSession(user) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase("auth_sessions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: user.id, token_hash: hashToken(token), expires_at: expiresAt })
  });
  return { token, expiresAt };
}
function bearerToken(req) {
  const header = String(req.headers?.authorization || "");
  const match = header.match(/^Bearer\\s+([A-Za-z0-9_-]{40,100})$/i);
  return match?.[1] || "";
}
function cookieToken(req) {
  const cookieHeader = String(req.headers?.cookie || "");
  const entry = cookieHeader.split(";").map(value => value.trim()).find(value => value.startsWith("am_session="));
  if (!entry) return "";
  try { return decodeURIComponent(entry.slice("am_session=".length)); } catch { return ""; }
}
function setSessionCookie(res, token, expiresAt) {
  const maxAge = Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  res.setHeader("Set-Cookie", `am_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/telegram; Max-Age=${maxAge}`);
}
function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "am_session=; HttpOnly; Secure; SameSite=Lax; Path=/api/auth/telegram; Max-Age=0");
}
async function getSession(token) {
  if (!token) return null;
  const rows = await supabase(
    `auth_sessions?token_hash=eq.${hashToken(token)}&revoked_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,user_id,expires_at&limit=1`
  );
  if (!rows[0]) return null;
  const users = await supabase(`users?id=eq.${encodeURIComponent(rows[0].user_id)}&select=id,phone,telegram_id,name,role,telegram_username,telegram_photo_url,telegram_first_name,telegram_last_name&limit=1`);
  const user = users[0];
  if (!user) return null;
  const role = user.telegram_id && adminTelegramIds().has(String(user.telegram_id)) ? "admin" : "customer";
  if (user.role !== role) {
    await supabase(`users?id=eq.${encodeURIComponent(user.id)}`, {
      method: "PATCH", headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ role, updated_at: new Date().toISOString() })
    });
    user.role = role;
  }
  return { session: rows[0], user };
}

// Legacy Telegram Login Widget signature validation. Never trust client-supplied profile fields before this passes.
function validateTelegramWidget(payload) {
  const botToken = env("TELEGRAM_BOT_TOKEN");
  if (!botToken || !payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const allowed = new Set(["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"]);
  const keys = Object.keys(payload);
  if (keys.some(key => !allowed.has(key)) || !/^[a-f0-9]{64}$/i.test(String(payload.hash || ""))) return false;
  if (!/^\\d{1,20}$/.test(String(payload.id || "")) || !/^\\d+$/.test(String(payload.auth_date || ""))) return false;
  const authDate = Number(payload.auth_date);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(authDate) || authDate > now + 30 || now - authDate > 5 * 60) return false;
  for (const key of ["first_name", "last_name", "username", "photo_url"]) {
    if (payload[key] !== undefined && typeof payload[key] !== "string") return false;
  }
  if (String(payload.first_name || "").length > 120 ||
      String(payload.last_name || "").length > 120 ||
      String(payload.username || "").length > 64 ||
      String(payload.photo_url || "").length > 2048) return false;
  if (payload.photo_url && !/^https:\\/\\//i.test(payload.photo_url)) return false;
  const checkString = keys.filter(key => key !== "hash").sort()
    .map(key => `${key}=${String(payload[key])}`).join("\\n");
  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const expected = crypto.createHmac("sha256", secretKey).update(checkString).digest();
  const received = Buffer.from(String(payload.hash), "hex");
  return received.length === expected.length && crypto.timingSafeEqual(expected, received);
}

export default async function handler(req, res) {
  const segments = Array.isArray(req.query?.path)
    ? req.query.path.map(String)
    : new URL(req.url || "/", "https://arzonmarket.local").pathname.split("/").filter(Boolean).slice(2);
  const route = segments.join("/").replace(/\\/$/, "");

  if (req.method === "POST" && route === "telegram/widget") {
    try {
      if (!validateTelegramWidget(req.body)) return reply(res, 401, { message: "Данные Telegram недействительны или устарели. Попробуйте войти снова." });
      const user = await upsertTelegramUser(req.body);
      const session = await createSession(user);
      setSessionCookie(res, session.token, session.expiresAt);
      return reply(res, 200, { expiresAt: session.expiresAt, sessionType: "telegram", user: userView(user) });
    } catch (error) {
      console.error("Telegram widget login failed:", error.message);
      if (error.status === 401 || error.status === 403) return reply(res, 503, { message: "Нет доступа к базе покупателей. Проверьте настройки Supabase." });
      return reply(res, 500, { message: "Не удалось завершить вход через Telegram. Проверьте настройки сервера." });
    }
  }

  if (req.method === "POST" && route === "telegram/logout") {
    try {
      const token = cookieToken(req) || bearerToken(req);
      if (token) await supabase(`auth_sessions?token_hash=eq.${hashToken(token)}&revoked_at=is.null`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ revoked_at: new Date().toISOString() })
      });
      clearSessionCookie(res);
      return reply(res, 200, { ok: true });
    } catch (error) {
      console.error("Telegram logout failed:", error.message);
      return reply(res, 200, { ok: true });
    }
  }

  if (req.method === "GET" && route === "telegram/session") {
    try {
      const current = await getSession(cookieToken(req) || bearerToken(req));
      if (!current) return reply(res, 401, { message: "Сессия завершена. Войдите снова." });
      return reply(res, 200, { user: userView(current.user), expiresAt: current.session.expires_at, sessionType: "telegram" });
    } catch (error) {
      console.error("Telegram session check failed:", error.message);
      return reply(res, 500, { message: "Не удалось проверить сессию." });
    }
  }

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
      if (!rows[0]?.id) throw new Error("Could not create Telegram login challenge");
      return reply(res, 200, { challengeId: rows[0].id, pollToken, expiresAt, deepLink: `https://t.me/${bot.username}?start=login_${challengeToken}` });
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
      if (!/^\\d{1,20}$/.test(telegramId)) return reply(res, 400, { message: "Некорректный Telegram ID." });
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
      const session = await createSession(user);
      setSessionCookie(res, session.token, session.expiresAt);
      return reply(res, 200, { expiresAt: session.expiresAt, sessionType: "telegram", user: userView(user) });
    } catch (error) {
      console.error("Telegram login poll failed:", error.message);
      if (error.status === 401 || error.status === 403) return reply(res, 503, { message: "Нет доступа к базе покупателей. Проверьте настройки Supabase." });
      return reply(res, 500, { message: "Не удалось завершить вход. Попробуйте ещё раз." });
    }
  }

  if (req.method !== "GET" && req.method !== "POST") res.setHeader("Allow", "GET, POST");
  return reply(res, 404, { message: "Маршрут авторизации не найден." });
}
