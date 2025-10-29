import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const id = e.queryStringParameters?.id;
  if (!id) return { statusCode: 400, body: "Missing id" };

  const { data: product, error: pErr } = await s
    .from("products")
    .select("id,name,slug,sku,price,product_type,active,created_at,updated_at")
    .eq("id", id).single();
  if (pErr) return { statusCode: 500, body: pErr.message };

  const { data: prices, error: prErr } = await s
    .from("product_prices")
    .select("id,price,effective_at")
    .eq("product_id", id)
    .order("effective_at",{ascending:false})
    .limit(5);
  if (prErr) return { statusCode: 500, body: prErr.message };

  return { statusCode: 200, body: JSON.stringify({ product, prices }) };
};
