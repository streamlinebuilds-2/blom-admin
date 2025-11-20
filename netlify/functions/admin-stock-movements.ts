// netlify/functions/admin-stock-movements.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    const limit = Number(e.queryStringParameters?.limit || 50);
    const { data, error } = await s
      .from("stock_movements")
      .select("*, product:products(id,name,slug)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
    return { statusCode: 200, body: JSON.stringify({ ok: true, data }) };
  } catch (err: any) {
    return { statusCode: 500, body: err.message || "admin-stock-movements failed" };
  }
};



