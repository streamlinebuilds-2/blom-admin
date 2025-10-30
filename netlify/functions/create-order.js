import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function generateOrderNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `ORD-${dateStr}-${random}`;
}

export const handler = async (event) => {
  try {
    const orderData = JSON.parse(event.body || "{}");

    // Generate merchant payment ID (unique identifier for PayFast)
    const m_payment_id = randomUUID();
    const order_number = generateOrderNumber();

    // Calculate totals (all in cents)
    const subtotal_cents = orderData.items?.reduce((sum, item) => {
      return sum + (item.unit_price_cents * item.qty);
    }, 0) || 0;

    const shipping_cents = orderData.shipping_cents || 0;
    const discount_cents = orderData.discount_cents || 0;
    const tax_cents = orderData.tax_cents || 0;
    const total_cents = subtotal_cents + shipping_cents - discount_cents + tax_cents;

    // Create order in database
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number,
        merchant_payment_id: m_payment_id,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        delivery_method: orderData.delivery_method,
        shipping_address: orderData.shipping_address,
        collection_slot: orderData.collection_slot,
        collection_location: orderData.collection_location,
        subtotal_cents,
        shipping_cents,
        discount_cents,
        tax_cents,
        total_cents,
        currency: orderData.currency || "ZAR",
        status: "unpaid",
        payment_status: "unpaid",
        fulfillment_status: "pending",
        placed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      throw new Error("Failed to create order");
    }

    // Create order items
    if (orderData.items && orderData.items.length > 0) {
      const itemsToInsert = orderData.items.map((item) => ({
        order_id: order.id,
        sku: item.sku,
        name: item.name,
        variant: item.variant,
        qty: item.qty,
        unit_price_cents: item.unit_price_cents,
        line_total_cents: item.unit_price_cents * item.qty,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error creating order items:", itemsError);
        // Order is created, items failed - log but continue
      }
    }

    // Return order with m_payment_id for PayFast checkout
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        order_id: order.id,
        order_number: order.order_number,
        m_payment_id,
        total_cents,
        total_zar: (total_cents / 100).toFixed(2),
      }),
    };
  } catch (e) {
    console.error("Create order error:", e);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: e.message || "Server error" }),
    };
  }
};


