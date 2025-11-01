// netlify/functions/adjust-stock.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const b = JSON.parse(e.body || "{}");

  if (!b.product_id || !b.quantity) return { statusCode: 400, body: "product_id & quantity required" };

  const qty = Number(b.quantity);

  const { error } = await s.from("stock_movements").insert({
    product_id: b.product_id,
    movement_type: 'adjustment',
    quantity: qty,                     // + or -
    unit_cost: null,
    actor: b.actor || 'admin',
    note: b.note || null
  });

  if (error) return { statusCode: 500, body: error.message };

  return { statusCode: 200, body: JSON.stringify({ ok:true }) };
};

