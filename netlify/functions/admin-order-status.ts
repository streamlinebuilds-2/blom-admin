import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const ALLOWED = new Set(["pending","paid","packed","shipped","delivered","cancelled","refunded"]);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const body = JSON.parse(e.body || "{}");
    const { id, status, tracking_number, shipping_provider } = body;
    if (!id || !status || !ALLOWED.has(status)) {
      return { statusCode: 400, body: "Missing id/status or invalid status" };
    }

    const patch: any = { status, updated_at: new Date().toISOString() };
    if (tracking_number) patch.tracking_number = tracking_number;
    if (shipping_provider) patch.shipping_provider = shipping_provider;

    const { data, error } = await s.from("orders").update(patch).eq("id", id).select().single();
    if (error) throw error;

    // OPTIONAL: notify n8n when shipped
    if (status === "shipped" && process.env.N8N_BASE) {
      try {
        await fetch(`${process.env.N8N_BASE}/webhook/order-shipped`, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ id, tracking_number, shipping_provider })
        });
      } catch {}
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true, data }) };
  } catch (err:any) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};

