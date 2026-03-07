import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (statusCode: number, body: any) => ({
  statusCode,
  headers: { ...CORS, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(500, { ok: false, error: "Missing SUPABASE environment variables" });
  }

  const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const qp = event.queryStringParameters || {};
    const productId = qp.product_id || "";

    if (!productId) {
      return json(400, { ok: false, error: "Missing product_id" });
    }

    if (event.httpMethod === "GET") {
      const tryJoin = await s
        .from("product_categories")
        .select("category:categories(slug)")
        .eq("product_id", productId);

      if (!tryJoin.error) {
        const slugs = (tryJoin.data || [])
          .map((row: any) => row?.category?.slug)
          .filter(Boolean);
        return json(200, { ok: true, slugs });
      }

      const trySlugCol = await s
        .from("product_categories")
        .select("category_slug")
        .eq("product_id", productId);

      if (!trySlugCol.error) {
        const slugs = (trySlugCol.data || [])
          .map((row: any) => row?.category_slug)
          .filter(Boolean);
        return json(200, { ok: true, slugs });
      }

      return json(500, { ok: false, error: tryJoin.error?.message || trySlugCol.error?.message || "Failed to load tags" });
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "{}");
      const slugs: string[] = Array.isArray(body.slugs) ? body.slugs.filter((s: any) => typeof s === "string") : [];

      const delRes = await s.from("product_categories").delete().eq("product_id", productId);
      if (delRes.error) {
        return json(500, { ok: false, error: delRes.error.message || "Failed to clear tags" });
      }

      if (slugs.length === 0) {
        return json(200, { ok: true });
      }

      const catRes = await s.from("categories").select("id,slug").in("slug", slugs);

      if (!catRes.error && Array.isArray(catRes.data) && catRes.data.length > 0) {
        const rows = catRes.data.map((c: any) => ({ product_id: productId, category_id: c.id }));
        const ins = await s.from("product_categories").insert(rows);
        if (ins.error) return json(500, { ok: false, error: ins.error.message || "Failed to save tags" });
        return json(200, { ok: true });
      }

      const rows = slugs.map((slug) => ({ product_id: productId, category_slug: slug }));
      const ins = await s.from("product_categories").insert(rows);
      if (ins.error) return json(500, { ok: false, error: ins.error.message || "Failed to save tags" });
      return json(200, { ok: true });
    }

    return json(405, { ok: false, error: "Method not allowed" });
  } catch (err: any) {
    return json(500, { ok: false, error: err?.message || String(err) });
  }
};
