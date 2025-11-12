import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const TRANSITIONS: Record<string, string[]> = {
  paid: ['packed'],
  packed: ['collected', 'out_for_delivery'], // collection goes to collected, delivery goes to out_for_delivery
  collected: [], // final state for collection
  out_for_delivery: ['delivered'],
  delivered: [] // final state for delivery
};

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: "Method Not Allowed" })
    };
  }
  try {
    const body = JSON.parse(e.body || "{}");
    const { id, status, tracking_number, shipping_provider } = body;
    if (!id || !status) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, error: "Missing id/status" })
      };
    }

    // Get current status
    const { data: current, error: fetchErr } = await s.from("orders").select("status").eq("id", id).single();
    if (fetchErr || !current) {
      return {
        statusCode: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, error: "Order not found" })
      };
    }

    const currentStatus = current.status || 'paid';
    
    // Get fulfillment type to validate transitions correctly
    const { data: orderData } = await s.from("orders").select("fulfillment_type").eq("id", id).single();
    const fulfillmentType = orderData?.fulfillment_type || 'delivery';
    
    // Validate transition based on fulfillment type
    const allowed = TRANSITIONS[currentStatus] || [];
    let isValidTransition = allowed.includes(status) || status === currentStatus;
    
    // Additional validation: collection can only go to collected, delivery to out_for_delivery/delivered
    if (fulfillmentType === 'collection' && status === 'out_for_delivery') isValidTransition = false;
    if (fulfillmentType === 'collection' && status === 'delivered') isValidTransition = false;
    if (fulfillmentType === 'delivery' && status === 'collected') isValidTransition = false;
    
    if (!isValidTransition) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, error: `Invalid transition ${currentStatus} → ${status} for ${fulfillmentType}` })
      };
    }

    const now = new Date().toISOString();
    const patch: any = { status, updated_at: now };
    
    // Set timeline timestamps
    if (status === 'packed') patch.order_packed_at = now;
    if (status === 'collected') {
      patch.order_collected_at = now;
      patch.fulfilled_at = now;
    }
    if (status === 'out_for_delivery') patch.order_out_for_delivery_at = now;
    if (status === 'delivered') {
      patch.order_delivered_at = now;
      patch.fulfilled_at = now;
    }
    
    if (tracking_number) patch.tracking_number = tracking_number;
    if (shipping_provider) patch.shipping_provider = shipping_provider;

    const { data, error } = await s.from("orders").update(patch).eq("id", id).select().single();
    if (error) throw error;

    // Fire n8n webhook for status notifications (best-effort)
    let webhookOk = true;
    let webhookError = null;

    // Determine which webhook to call based on status and fulfillment type
    const webhookUrls: Record<string, string> = {
      'packed_collection': 'https://dockerfile-1n82.onrender.com/webhook/order-ready-for-collection',
      'out_for_delivery': 'https://dockerfile-1n82.onrender.com/webhook/out-for-delivery',
      'collected': 'https://dockerfile-1n82.onrender.com/webhook/order-collected',
      'delivered': 'https://dockerfile-1n82.onrender.com/webhook/order-delivered'
    };

    let webhookUrl: string | null = null;

    // Determine which webhook to call
    if (status === 'packed' && fulfillmentType === 'collection') {
      webhookUrl = webhookUrls['packed_collection'];
    } else if (status === 'out_for_delivery') {
      webhookUrl = webhookUrls['out_for_delivery'];
    } else if (status === 'collected') {
      webhookUrl = webhookUrls['collected'];
    } else if (status === 'delivered') {
      webhookUrl = webhookUrls['delivered'];
    }

    if (webhookUrl && data) {
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: data.id,
            order_number: data.order_number || data.m_payment_id,
            customer_name: data.buyer_name || data.customer_name,
            customer_email: data.buyer_email || data.customer_email,
            customer_phone: data.contact_phone || data.customer_phone,
            status: status,
            fulfillment_type: data.fulfillment_type,
            tracking_number: tracking_number || data.tracking_number,
            shipping_provider: shipping_provider || data.shipping_provider
          })
        });
        webhookOk = res.ok;
        if (!res.ok) {
          webhookError = await res.text().catch(() => "Webhook failed");
        }
      } catch (e: any) {
        webhookOk = false;
        webhookError = e?.message || "Webhook fetch failed";
      }
    }

    return {
      statusCode: webhookOk || !webhookUrl ? 200 : 207, // 207 = Multi-Status (updated but notify failed)
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        ok: true,
        data,
        webhookCalled: !!webhookUrl,
        webhookOk: webhookOk,
        webhookError: webhookError || null
      })
    };
  } catch (err:any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
