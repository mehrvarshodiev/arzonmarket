const env = (name) => globalThis.process?.env?.[name];

async function supabase(path) {
  const base = env("SUPABASE_URL");
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) throw new Error("Supabase environment variables are missing");

  const response = await fetch(`${base}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("is_active", "eq.true");
    params.set("limit", "200");

    const category = String(req.query?.category || req.query?.type || "").trim();
    const brand = String(req.query?.brand || "").trim();
    const q = String(req.query?.q || "").trim().slice(0, 60);
    const featured = String(req.query?.featured || "");
    const sort = String(req.query?.sort || "newest");

    if (category) params.set("category", `eq.${category}`);
    if (brand) params.set("brand", `eq.${brand}`);
    if (featured === "true") params.set("featured", "eq.true");
    if (q) {
      const safe = q.replace(/[,%()]/g, "");
      params.set("or", `(name.ilike.*${safe}*,description.ilike.*${safe}*)`);
    }
    if (sort === "cheap") params.set("order", "price.asc");
    else if (sort === "expensive") params.set("order", "price.desc");
    else if (sort === "popular") params.set("order", "featured.desc,created_at.desc");
    else params.set("order", "created_at.desc");

    const rows = await supabase(`products?${params.toString()}`);
    const products = rows.map((p) => ({
      ...p,
      _id: p.id,
      oldPrice: p.old_price,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
    return res.status(200).json(products);
  } catch (error) {
    console.error("Products API error:", error);
    return res.status(500).json({ message: "Не удалось загрузить каталог товаров" });
  }
}
