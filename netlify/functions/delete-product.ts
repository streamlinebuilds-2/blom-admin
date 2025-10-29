import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  const { id } = JSON.parse(e.body || "{}");
  if (!id) return { statusCode: 400, body: "Missing id" };
  const { error } = await s.from("products").delete().eq("id", id);
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
