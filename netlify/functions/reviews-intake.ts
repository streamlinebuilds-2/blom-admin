// netlify/functions/reviews-intake.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const { product_id, name, rating, title, body } = JSON.parse(e.body || "{}");
    if (!product_id || !name || !rating) return { statusCode: 400, body: "Missing product_id/name/rating" };

    const { data, error } = await s.from("product_reviews").insert({
      product_id, name: String(name).trim(), rating: Number(rating),
      title: title || null, body: body || null, status: "pending"
    }).select("id").single();
    if (error) return { statusCode: 500, body: error.message };

    // Optional: ping n8n "intake" flow for notifications
    if (process.env.REVIEWS_INTAKE_WEBHOOK) {
      await fetch(process.env.REVIEWS_INTAKE_WEBHOOK, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: data.id, product_id, name, rating, title, body, status: "pending" })
      }).catch(()=>{});
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (err:any) {
    return { statusCode: 500, body: err.message || "reviews-intake failed" };
  }
};

