import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const body = JSON.parse(e.body || "{}");
  if (!body.name || body.price == null) return { statusCode: 400, body: "Missing name/price" };

  const slug = (body.slug?.trim())
    ? body.slug.trim().toLowerCase()
    : slugify(body.name, { lower: true, strict: true });

  let prevPrice: number | null = null;
  if (body.id) {
    const { data: ex, error: exErr } = await s.from("products").select("id,price").eq("id", body.id).single();
    if (exErr && exErr.code !== "PGRST116") return { statusCode: 500, body: exErr.message };
    prevPrice = ex?.price ?? null;
  }

  const payload = {
    id: body.id ?? undefined,
    name: body.name.trim(),
    slug,
    sku: body.sku?.trim() || null,
    price: Number(body.price),
    product_type: body.product_type || "simple",
    active: body.active ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data: upserted, error: uErr } = await s
    .from("products").upsert(payload, { onConflict: "slug" }).select().single();
  if (uErr) return { statusCode: 500, body: uErr.message };

  if (prevPrice == null || Number(prevPrice) !== Number(payload.price)) {
    const { error: phErr } = await s
      .from("product_prices").insert({ product_id: upserted.id, price: payload.price });
    if (phErr && phErr.code !== "23505") return { statusCode: 500, body: phErr.message };
  }

  return { statusCode: 200, body: JSON.stringify({ product: upserted }) };
};
