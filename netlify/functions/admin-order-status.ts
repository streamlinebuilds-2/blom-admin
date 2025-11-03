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

    const patch: any = { status, updated_at: new Date().toISOString() };
    if (status === 'delivered' || status === 'collected') {
      patch.fulfilled_at = new Date().toISOString();
    }
    if (tracking_number) patch.tracking_number = tracking_number;
    if (shipping_provider) patch.shipping_provider = shipping_provider;

    const { data, error } = await s.from("orders").update(patch).eq("id", id).select().single();
    if (error) throw error;

    // OPTIONAL: notify n8n when out for delivery
    if (status === "out_for_delivery" && process.env.N8N_BASE) {
      try {
        await fetch(`${process.env.N8N_BASE}/webhook/order-shipped`, {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ id, tracking_number, shipping_provider })
        });
      } catch {}
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, data })
    };
  } catch (err:any) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
