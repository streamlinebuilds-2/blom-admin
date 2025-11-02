// netlify/functions/admin-review.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    const id = e.queryStringParameters?.id || "";
    if (!id) return { statusCode: 400, body: "Missing id" };
    const { data, error } = await s.from("product_reviews").select("*, product:products(name,slug)").eq("id", id).single();
    if (error) return { statusCode: 500, body: error.message };
    return { statusCode: 200, body: JSON.stringify({ review: data }) };
  } catch (err:any) {
    return { statusCode: 500, body: err.message || "admin-review failed" };
  }
};



