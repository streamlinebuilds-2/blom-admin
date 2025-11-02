import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    const url = new URL(e.rawUrl);
    const page = Number(url.searchParams.get("page") || 1);
    const size = Math.min(Number(url.searchParams.get("size") || 20), 100);
    const status = url.searchParams.get("status") || "";
    const search = (url.searchParams.get("search") || "").trim();
    const from = (page - 1) * size;
    const to = from + size - 1;

    let query = s.from("orders")
      .select("id,m_payment_id,buyer_name,buyer_email,status,total,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);
    if (search) {
      // naive search over id, m_payment_id, email, name
      query = query.or(`m_payment_id.ilike.%${search}%,buyer_email.ilike.%${search}%,buyer_name.ilike.%${search}%`);
    }

    const { data: rows, error, count } = await query;
    if (error) throw error;

    // item counts
    const ids = rows.map(r => r.id);
    let byOrder: Record<string, number> = {};
    if (ids.length) {
      const { data: items, error: iErr } = await s.from("order_items")
        .select("order_id, quantity");
      if (iErr) throw iErr;
      for (const it of items || []) {
        byOrder[it.order_id] = (byOrder[it.order_id] || 0) + (it.quantity || 0);
      }
    }

    const data = rows.map(r => ({
      ...r,
      item_count: byOrder[r.id] || 0,
      short_code: "BL-" + (r.m_payment_id || "").replace(/[^A-Za-z0-9]/g,"").slice(-8).toUpperCase()
    }));

    return { statusCode: 200, body: JSON.stringify({ ok: true, total: count || 0, data }) };
  } catch (err:any) {
    return { statusCode: 500, body: JSON.stringify({ ok:false, error: err.message }) };
  }
};
