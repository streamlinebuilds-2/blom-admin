// netlify/functions/moderate-review.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const { id, action } = JSON.parse(e.body || "{}"); // action: 'approve' | 'reject'
    if (!id || !action) return { statusCode: 400, body: "Missing id/action" };

    const patch: any = { status: action === "approve" ? "approved" : "rejected" };
    if (action === "approve") patch.published_at = new Date().toISOString();

    const { data, error } = await s.from("product_reviews").update(patch).eq("id", id).select("id, product_id, name, rating, title, body, status").single();
    if (error) return { statusCode: 500, body: error.message };

    // Optional: n8n "moderate" webhooks
    const hook = action === "approve" ? process.env.REVIEWS_APPROVE_WEBHOOK : process.env.REVIEWS_REJECT_WEBHOOK;
    if (hook) {
      await fetch(hook, {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ ...data, action })
      }).catch(()=>{});
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err:any) {
    return { statusCode: 500, body: err.message || "moderate-review failed" };
  }
};



