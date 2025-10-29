import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };
  const page = Number(e.queryStringParameters?.page ?? 1);
  const pageSize = Number(e.queryStringParameters?.pageSize ?? 20);
  const q = (e.queryStringParameters?.q || "").trim();
  const active = e.queryStringParameters?.active;

  let qy = s.from("products")
    .select("id,name,slug,sku,price,product_type,active,created_at,updated_at")
    .order("created_at",{ascending:false})
    .range((page-1)*pageSize, page*pageSize-1);

  if (q) qy = qy.ilike("name", `%${q}%`);
  if (active === "true") qy = qy.eq("active", true);
  if (active === "false") qy = qy.eq("active", false);

  const { data, error } = await qy;
  if (error) return { statusCode: 500, body: error.message };
  return { statusCode: 200, body: JSON.stringify({ data }) };
};
