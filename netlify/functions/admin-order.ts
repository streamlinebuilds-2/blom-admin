import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    // Handle PATCH request for archiving orders
    if (e.httpMethod === 'PATCH') {
      const body = JSON.parse(e.body || '{}');
      const { id, archived } = body;

      if (!id) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing order id" }) };
      }

      // Update the order's archived status
      const { data, error } = await s.from("orders")
        .update({ archived: archived })
        .eq("id", id)
        .select();

      if (error) throw error;

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: true, order: data[0] })
      };
    }

    // Handle GET request for fetching order details
    const id = new URL(e.rawUrl).searchParams.get("id");
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing id" }) };
    }

    // 1. Get Order with specific columns - include all pricing fields
    const { data: order, error: oErr } = await s.from("orders")
      .select(`
        *,
        shipping_address,
        fulfillment_type,
        buyer_name, buyer_email, buyer_phone,
        customer_name, customer_email, customer_phone,
        total_cents, subtotal_cents, shipping_cents, discount_cents,
        total, subtotal, shipping, discount
      `)
      .eq("id", id).single();

    if (oErr) throw oErr;

    // 2. Get Items with fallback pricing fields
    const { data: items, error: iErr } = await s.from("order_items")
      .select(`
        name, product_name, quantity, 
        unit_price_cents, line_total_cents, 
        price, total, unit_price, line_total,
        variant, sku
      `)
      .eq("order_id", id)
      .order("name", { ascending: true });

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
