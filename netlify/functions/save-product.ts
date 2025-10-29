import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import slugify from "slugify";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

type ProductInput = {
  id?: string;
  name: string;
  sku?: string;
  price: number;
  product_type?: string;
  active?: boolean;
  slug?: string;
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const body: ProductInput = JSON.parse(event.body || "{}");

    if (!body.name || body.price == null) {
      return { statusCode: 400, body: "Missing required fields (name, price)" };
    }

    const slug = (body.slug && body.slug.trim())
      ? body.slug.trim().toLowerCase()
      : slugify(body.name, { lower: true, strict: true });

    // fetch existing (if updating) to compare price
    let prevPrice: number | null = null;
    if (body.id) {
      const { data: existing, error: eErr } = await supabase
        .from("products")
        .select("id, price")
        .eq("id", body.id)
        .single();
      if (eErr && eErr.code !== "PGRST116") throw eErr; // ignore not found
      prevPrice = existing?.price ?? null;
    }

    const payload = {
      id: body.id ?? undefined,
      name: body.name.trim(),
      slug,
      sku: body.sku?.trim() || null,
      price: Number(body.price),
      product_type: body.product_type || "simple",
      active: body.active ?? true,
      updated_at: new Date().toISOString()
    };

    const { data: upserted, error: uErr } = await supabase
      .from("products")
      .upsert(payload, { onConflict: "slug" })
      .select()
      .single();
    if (uErr) throw uErr;

    // log price history if changed (defensive — trigger also handles it)
    if (prevPrice == null || Number(prevPrice) !== Number(payload.price)) {
      const { error: phErr } = await supabase
        .from("product_prices")
        .insert({ product_id: upserted.id, price: payload.price });
      // If unique-daily constraint hits, ignore
      if (phErr && phErr.code !== "23505") throw phErr;
    }

    return { statusCode: 200, body: JSON.stringify({ product: upserted }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Error saving product" };
  }
};
