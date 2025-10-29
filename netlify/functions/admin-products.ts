import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") return { statusCode: 405, body: "Method Not Allowed" };

    const page = Number(event.queryStringParameters?.page ?? 1);
    const pageSize = Number(event.queryStringParameters?.pageSize ?? 20);
    const q = (event.queryStringParameters?.q || "").trim();
    const active = event.queryStringParameters?.active;

    let query = supabase
      .from("products")
      .select("id, name, slug, sku, price, product_type, active, created_at, updated_at")
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (q) query = query.ilike("name", `%${q}%`);
    if (active === "true") query = query.eq("active", true);
    if (active === "false") query = query.eq("active", false);

    const { data, error } = await query;
    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ data }) };
  } catch (e: any) {
    return { statusCode: 500, body: e.message || "Error" };
  }
};
