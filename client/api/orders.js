import crypto from "node:crypto";

const env = (name) => globalThis.process?.env?.[name];
const reply = (res, status, payload) => res.status(status).json(payload);
function readBearerToken(req) {
  const header = String(req.headers?.authorization || "");
  const match = header.match(/^Bearer\s+([A-Za-z0-9._-]+)$/i);
  return match?.[1] || "";
}

function verifyPhoneJwt(token) {
  const secret = env("JWT_SECRET");
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (header.alg !== "HS256" || !payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) return null;
    const expected = crypto.createHmac("sha256", secret).update(parts[0] + "." + parts[1]).digest();
    const received = Buffer.from(parts[2], "base64url");
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
    return payload;
  } catch { return null; }
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
  const body = await response.text();
  if (!response.ok) {
    const error = new Error(`Supabase request failed (${response.status}): ${body.slice(0, 180)}`);
    error.status = response.status;
    throw error;
  }
  return body ? JSON.parse(body) : [];
}

async function requireCustomer(req) {
  const claims = verifyPhoneJwt(readBearerToken(req));
  if (!claims) return null;
  const users = await supabase(
    `users?id=eq.${encodeURIComponent(String(claims.sub))}&select=id,name,phone,role&limit=1`
  );
  return users[0] || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { message: "Метод не поддерживается." });
  }

  try {
    const user = await requireCustomer(req);
    if (!user) return reply(res, 401, { message: "Войдите в аккаунт, чтобы оформить заказ." });

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = String(body.name || user.name || "").trim().slice(0, 180);
    const phone = String(body.phone || user.phone || "").trim().slice(0, 40);
    const city = String(body.city || "").trim().slice(0, 100);
    const streetAddress = String(body.address || "").trim().slice(0, 500);
    const rawItems = body.items;

    if (!name || !phone || !city || !streetAddress) {
      return reply(res, 400, { message: "Заполните имя, телефон, город и адрес доставки." });
    }
    if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 30) {
      return reply(res, 400, { message: "Корзина пуста или содержит слишком много позиций." });
    }

    const items = [];
    let total = 0;
    for (const raw of rawItems) {
      const id = String(raw?.id || "").trim();
      const quantity = Number(raw?.quantity);
      const color = raw?.color == null ? null : String(raw.color).trim().slice(0, 80);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
          !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        return reply(res, 400, { message: "В корзине есть некорректный товар или количество." });
      }

      const products = await supabase(
        `products?id=eq.${encodeURIComponent(id)}&is_active=eq.true&select=id,name,price,images,stock&limit=1`
      );
      const product = products[0];
      if (!product) return reply(res, 400, { message: "Один из товаров больше недоступен. Обновите корзину." });
      if (Number(product.stock) < quantity) {
        return reply(res, 409, { message: `Недостаточно товара «${String(product.name).slice(0, 100)}» на складе.` });
      }
      const price = Number(product.price);
      if (!Number.isFinite(price) || price < 0) throw new Error("Invalid product price");
      const lineTotal = Math.round(price * quantity * 100) / 100;
      total += lineTotal;
      items.push({
        id: product.id,
        name: product.name,
        price,
        quantity,
        color,
        image: Array.isArray(product.images) ? (product.images[0] || null) : null,
        lineTotal
      });
    }

    total = Math.round(total * 100) / 100;
    const address = [city, streetAddress].filter(Boolean).join(", ");
    const orders = await supabase("orders?select=id,total,status,created_at", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        customer_name: name,
        phone,
        address,
        items,
        total,
        status: "new"
      })
    });
    if (!orders[0]?.id) throw new Error("Order was not created");
    return reply(res, 201, { ok: true, orderId: orders[0].id, total: Number(orders[0].total ?? total), status: orders[0].status || "new" });
  } catch (error) {
    console.error("Order creation failed:", error.message);
    if (error.status === 401 || error.status === 403) {
      return reply(res, 503, { message: "Сервис базы данных временно недоступен. Попробуйте позже." });
    }
    return reply(res, 500, { message: "Не удалось оформить заказ. Попробуйте ещё раз." });
  }
}
