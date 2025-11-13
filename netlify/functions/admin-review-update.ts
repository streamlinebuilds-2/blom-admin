import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type"
};

export const handler: Handler = async (e) => {
  if (e.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS };
  if (e.httpMethod !== "POST") return { statusCode: 405, headers: CORS };

  try {
    const { id, status } = JSON.parse(e.body || "{}");
    if (!id || !status) return { statusCode: 400, headers: CORS, body: "Missing id or status" };

    const updates: any = { status };
    if (status === 'approved') updates.published_at = new Date().toISOString();

    const { error } = await s.from("product_reviews").update(updates).eq("id", id);
    if (error) throw error;

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    return { statusCode: 500, headers: CORS, body: err.message || "Update failed" };
  }
};
