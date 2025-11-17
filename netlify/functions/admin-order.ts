import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    const id = new URL(e.rawUrl).searchParams.get("id");
    if (!id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, error: "Missing id" })
      };
    }

    const { data: order, error: oErr } = await s.from("orders")
      .select("*, shipping_address, shipping_method, contact_phone, placed_at, fulfilled_at, paid_at, order_packed_at, order_collected_at, order_out_for_delivery_at, order_delivered_at")
      .eq("id", id).single();
    if (oErr) throw oErr;

    const { data: items, error: iErr } = await s.from("order_items")
      .select("*").eq("order_id", id).order("name", { ascending: true });
    if (iErr) throw iErr;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, order, items })
    };
  } catch (err:any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
