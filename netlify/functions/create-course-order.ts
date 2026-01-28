import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${dateStr}-${random}`;
};

export const handler: Handler = async (event) => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: "Missing Supabase env vars" }) };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const buyer_name = String(body.buyer_name || body.customer_name || "").trim();
    const buyer_email = String(body.buyer_email || body.customer_email || "").trim();
    const buyer_phone = String(body.buyer_phone || body.customer_phone || "").trim() || null;

    const course_slug = String(body.course_slug || "").trim();
    const course_title = String(body.course_title || body.item_name || "").trim();
    const course_type = String(body.course_type || "").trim();
    const selected_package = body.selected_package == null ? null : String(body.selected_package).trim();
    const selected_date = body.selected_date == null ? null : String(body.selected_date).trim();

    const payment_kind = String(body.payment_kind || "full").trim();
    const full_price_cents = Number(body.full_price_cents ?? body.course_price_cents ?? body.price_cents);
    const deposit_cents = body.deposit_cents == null ? null : Number(body.deposit_cents);

    if (!buyer_name) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Missing buyer_name" }) };
    }
    if (!buyer_email) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Missing buyer_email" }) };
    }
    if (!course_slug) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Missing course_slug" }) };
    }
    if (!course_title) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Missing course_title" }) };
    }
    if (course_type !== "online" && course_type !== "in-person") {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid course_type" }) };
    }
    if (!Number.isFinite(full_price_cents) || full_price_cents <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid full_price_cents" }) };
    }
    if (payment_kind !== "full" && payment_kind !== "deposit") {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid payment_kind" }) };
    }
    if (payment_kind === "deposit") {
      if (!Number.isFinite(deposit_cents as any) || (deposit_cents as number) <= 0) {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: "Invalid deposit_cents" }) };
      }
    }

    const m_payment_id = randomUUID();
    const order_number = generateOrderNumber();
    const amount_to_pay_cents = payment_kind === "deposit" ? (deposit_cents as number) : full_price_cents;
    const amount_owed_cents = Math.max(0, full_price_cents);

    const baseOrder = {
      order_number,
      m_payment_id,
      merchant_payment_id: m_payment_id,
      buyer_name,
      buyer_email,
      contact_phone: buyer_phone,
      customer_name: buyer_name,
      customer_email: buyer_email,
      customer_phone: buyer_phone,
      subtotal_cents: amount_to_pay_cents,
      shipping_cents: 0,
      discount_cents: 0,
      tax_cents: 0,
      total_cents: amount_to_pay_cents,
      total: Math.round(amount_to_pay_cents) / 100,
      currency: "ZAR",
      status: "unpaid",
      payment_status: "unpaid",
      fulfillment_status: "pending",
      fulfillment_method: null,
      delivery_method: null,
      fulfillment_type: null,
      placed_at: new Date().toISOString(),
    };

    let orderInsert: any = { ...baseOrder, order_kind: "course" };
    let orderRes = await s.from("orders").insert(orderInsert).select().single();
    if (orderRes.error && /order_kind/i.test(orderRes.error.message || "")) {
      orderRes = await s.from("orders").insert(baseOrder).select().single();
    }
    if (orderRes.error) throw orderRes.error;

    const order = orderRes.data;

    const itemName = selected_package ? `${course_title} — ${selected_package}` : course_title;
    const { error: itemErr } = await s.from("order_items").insert({
      order_id: order.id,
      product_id: null,
      sku: course_slug,
      name: itemName,
      variant: selected_date,
      quantity: 1,
      unit_price_cents: amount_to_pay_cents,
      line_total_cents: amount_to_pay_cents,
    });
    if (itemErr) throw itemErr;

    const basePurchase: any = {
      order_id: order.id,
      course_slug,
      buyer_email,
      buyer_name,
      buyer_phone,
      invitation_status: "pending",
      invited_at: null,
      created_at: new Date().toISOString(),
      course_title,
      course_type,
      selected_package,
      selected_date,
      amount_paid_cents: 0,
      payment_kind,
      details: {
        source: "checkout",
        full_price_cents,
        deposit_cents: payment_kind === "deposit" ? deposit_cents : null,
      },
    };

    let purchaseInsert: any = { ...basePurchase, amount_owed_cents };
    let purchaseRes = await s.from("course_purchases").insert(purchaseInsert).select().single();
    if (purchaseRes.error && /amount_owed_cents/i.test(purchaseRes.error.message || "")) {
      purchaseRes = await s.from("course_purchases").insert(basePurchase).select().single();
    }
    if (purchaseRes.error) throw purchaseRes.error;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        order_id: order.id,
        order_number: order.order_number,
        m_payment_id,
        total_cents: amount_to_pay_cents,
        total_zar: (amount_to_pay_cents / 100).toFixed(2),
        course_purchase_id: purchaseRes.data?.id,
      }),
    };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message || String(err) }) };
  }
};
