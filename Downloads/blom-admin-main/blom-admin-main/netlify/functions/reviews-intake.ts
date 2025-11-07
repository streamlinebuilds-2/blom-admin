import { Handler } from "@netlify/functions";
import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

const isUUID = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, body: "Missing Supabase envs" };
  }

  // Parse body (handle base64 + missing header cases)
  let raw = event.body || "";
  if (event.isBase64Encoded) raw = Buffer.from(raw, "base64").toString("utf8");
  let body: any = {};
  try { body = JSON.parse(raw || "{}"); }
  catch { return { statusCode: 400, body: "Invalid JSON" }; }

  // Normalize inputs
  const productIdRaw = String(body.product_id || body.product_slug || "").trim();
  const reviewer_name = String(body.reviewer_name || body.name || "").trim();
  const reviewer_email = String(body.reviewer_email || body.email || "").trim();
  const rating = Number(body.rating ?? 0);
  const title = (body.title ?? "").toString().trim() || null;
  const comment = (body.comment ?? body.body ?? "").toString().trim() || null;

  // Validate
  if (!productIdRaw) return { statusCode: 400, body: "product_id or product_slug required" };
  if (!reviewer_name) return { statusCode: 400, body: "name required" };
  if (!reviewer_email) return { statusCode: 400, body: "email required" };
  if (!(rating >= 1 && rating <= 5)) return { statusCode: 400, body: "rating must be 1..5" };

  // Resolve slug -> UUID if needed
  let product_id = productIdRaw;
  if (!isUUID(productIdRaw)) {
   const r = await fetch(`${SUPABASE_URL}/rest/v1/products?slug=eq.${encodeURIComponent(productIdRaw)}&select=id`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Prefer: "return=representation",
      },
    });
    if (!r.ok) return { statusCode: 500, body: `Product lookup failed: ${await r.text()}` };
    const rows = await r.json();
    if (!rows?.length) return { statusCode: 400, body: `Unknown product slug: ${productIdRaw}` };
    product_id = rows[0].id;
  }

  // Insert as pending
  const payload = [{
    product_id,
    reviewer_name,
    reviewer_email,
    rating,
    title,
    comment,
    status: "pending",
    source: "storefront",
  }];

  const ins = await fetch(`${SUPABASE_URL}/rest/v1/product_reviews`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(payload),
  });

  if (!ins.ok) {
    const t = await ins.text();
    return { statusCode: 500, body: `DB insert failed: ${t}` };
  }

  const [review] = await ins.json();
  return { statusCode: 200, body: JSON.stringify({ ok: true, review }) };
};