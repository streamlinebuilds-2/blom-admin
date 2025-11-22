import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  // Add early check for missing env vars
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables" })
    };
  }

  try {
    const url = new URL(e.rawUrl);
    const page = Number(url.searchParams.get("page") || 1);
    const size = Math.min(Number(url.searchParams.get("size") || 20), 100);
    const status = url.searchParams.get("status") || "";
    const fulfillment = url.searchParams.get("fulfillment") || "";
    const search = (url.searchParams.get("search") || "").trim();
    const from = (page - 1) * size;
    const to = from + size - 1;

    let query = s.from("orders")
      .select("id,m_payment_id,buyer_name,buyer_email,contact_phone,status,payment_status,total_cents,created_at,placed_at,paid_at,fulfillment_type,fulfillment_method,shipping_method,customer_name,customer_email,customer_phone,shipping_address,delivery_method,collection_slot,subtotal_cents,shipping_cents,discount_cents", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    // Filter for paid orders: payment_status = 'paid' OR status = 'paid'
    query = query.or('payment_status.eq.paid,status.in.(paid,packed,collected,out_for_delivery,delivered)');

    // Exclude archived orders
    query = query.or('archived.is.null,archived.eq.false');

    // NOTE: Removed strict fulfillment_type requirement to show all orders
    // Previously: query = query.not('fulfillment_type', 'is', null);

    if (status) query = query.eq("status", status);
    if (fulfillment) query = query.eq("fulfillment_method", fulfillment);
    if (search) {
      query = query.or([
        `m_payment_id.ilike.%${search}%`,
        `buyer_email.ilike.%${search}%`,
        `buyer_name.ilike.%${search}%`,
        `contact_phone.ilike.%${search}%`
      ].join(","));
    }

    const { data: rows, error, count } = await query;
    if (error) throw error;

    // item counts and workshop detection
    const ids = rows.map(r => r.id);
    let byOrder: Record<string, number> = {};
    let workshopOrders: Set<string> = new Set();
    if (ids.length) {
      const { data: items, error: iErr } = await s.from("order_items")
        .select("order_id, quantity, name, sku")
        .in("order_id", ids);
      if (iErr) throw iErr;
      for (const it of items || []) {
        byOrder[it.order_id] = (byOrder[it.order_id] || 0) + (it.quantity || 0);
        // Detect workshop/course orders
        const nameLower = (it.name || '').toLowerCase();
        const skuLower = (it.sku || '').toLowerCase();
        if (nameLower.includes('workshop') || nameLower.includes('course') ||
            skuLower.includes('workshop') || skuLower.includes('course')) {
          workshopOrders.add(it.order_id);
        }
      }
    }

    const data = rows.map(r => ({
      ...r,
      item_count: byOrder[r.id] || 0,
      is_workshop: workshopOrders.has(r.id),
      short_code: "BL-" + (r.m_payment_id || "").replace(/[^A-Za-z0-9]/g,"").slice(-8).toUpperCase(),
      // Normalize field names (use buyer_* or fallback to customer_*)
      buyer_name: r.buyer_name || r.customer_name,
      buyer_email: r.buyer_email || r.customer_email,
      contact_phone: r.contact_phone || r.customer_phone
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, total: count || 0, data })
    };
  } catch (err:any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
