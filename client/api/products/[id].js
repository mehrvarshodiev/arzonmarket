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

  // Vercel supplies [id] as req.query.id for this dynamic serverless route.
  const id = String(req.query?.id || "").trim();
  if (!id) return res.status(400).json({ message: "Не указан ID товара" });

  try {
    const params = new URLSearchParams({
      select: "*",
      id: `eq.${id}`,
      is_active: "eq.true",
      limit: "1"
    });
    const rows = await supabase(`products?${params.toString()}`);
    const product = rows[0];

    if (!product) return res.status(404).json({ message: "Товар не найден" });

    res.setHeader("Cache-Control", "s-maxage=20, stale-while-revalidate=60");
    return res.status(200).json({
      ...product,
      _id: product.id,
      oldPrice: product.old_price,
      createdAt: product.created_at,
      updatedAt: product.updated_at
    });
  } catch (error) {
    console.error("Product detail API error:", error);
    return res.status(500).json({ message: "Не удалось загрузить товар" });
  }
}
