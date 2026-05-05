// netlify/functions/reviews-intake.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler: Handler = async (e) => {
  if (e.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "ok" };
  if (e.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  try {
    if (!e.body) return { statusCode: 400, headers: CORS, body: "Empty body" };
    const payload = JSON.parse(e.body);

    // Accept either product_id (uuid) OR product_slug - resolve both
    const rawProd = String(payload.product_id ?? payload.product_slug ?? "").trim();
    if (!rawProd) return { statusCode: 400, headers: CORS, body: "Missing product_id or product_slug" };

    let product_id = rawProd;
    let product_slug = rawProd;

    if (/^[0-9a-f-]{36}$/i.test(rawProd)) {
      // raw is UUID: look up slug
      const { data: p, error: pe } = await s.from("products").select("slug").eq("id", rawProd).single();
      if (pe || !p) return { statusCode: 400, headers: CORS, body: "Invalid product_id (not found)" };
      product_slug = p.slug;
    } else {
      // raw is slug: look up id
      const { data: p, error: pe } = await s.from("products").select("id").eq("slug", rawProd).single();
      if (pe || !p) return { statusCode: 400, headers: CORS, body: "Invalid product_slug (not found)" };
      product_id = p.id;
    }

    // Map fields
    const name = (payload.name ?? payload.reviewer_name ?? "").toString().trim();
    const email = (payload.email ?? payload.reviewer_email ?? null)?.toString()?.trim() || null;
    const title = (payload.title ?? null)?.toString()?.trim() || null;
    const body = (payload.body ?? "").toString().trim();
    const rating = Number(payload.rating);
    const imagesIn = payload.images ?? payload.photos ?? [];
    const images: string[] = Array.isArray(imagesIn) ? imagesIn.map((u: any) => String(u)) : [];
    const is_verified_buyer = Boolean(payload.is_verified_buyer ?? false);
    const order_id = payload.order_id ? String(payload.order_id) : null;

    // Validate minimum
    if (!name || !body || !(rating >= 1 && rating <= 5)) {
      return { statusCode: 400, headers: CORS, body: "Missing/invalid name, body, or rating (1..5)" };
    }

    const row = {
      product_id,
      product_slug, // Required to satisfy NOT NULL
      name,
      email,
      title,
      body,
      rating,
      images,
      is_verified_buyer,
      order_id,
      status: "pending",
    };

    const { data, error } = await s.from("product_reviews").insert(row).select("id").single();

    if (error) return { statusCode: 500, headers: CORS, body: `DB insert failed: ${error.message}` };

    // Optional: notify n8n if you set REVIEWS_INTAKE_WEBHOOK
    if (process.env.REVIEWS_INTAKE_WEBHOOK) {
      console.log("Triggering N8N webhook:", process.env.REVIEWS_INTAKE_WEBHOOK);
      try {
        await fetch(process.env.REVIEWS_INTAKE_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_id: data.id,
            product_id,
            product_slug,
            name,
            email,
            title,
            body,
            rating,
            images,
            is_verified_buyer,
            order_id,
            status: "pending",
          }),
        });
        console.log("N8N webhook triggered successfully");
      } catch (webhookError: any) {
        console.error("Failed to trigger N8N webhook:", webhookError.message);
      }
    } else {
        console.log("No REVIEWS_INTAKE_WEBHOOK configured");
    }

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: `reviews-intake exception: ${err?.message || "unknown"}` };
  }
};
