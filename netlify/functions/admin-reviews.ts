// netlify/functions/admin-reviews.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    const qp = e.queryStringParameters || {};
    const status = qp.status || "";
    const limit = Number(qp.limit || 50);
    const from = Number(qp.from || 0);
    let q = s.from("product_reviews").select("*, product:products(name,slug)").order("created_at", { ascending: false }).range(from, from+limit-1);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { statusCode: 500, body: error.message };
    return { statusCode: 200, body: JSON.stringify({ data }) };
  } catch (err:any) {
    return { statusCode: 500, body: err.message || "admin-reviews failed" };
  }
};



