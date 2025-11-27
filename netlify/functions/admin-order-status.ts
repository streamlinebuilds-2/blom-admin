import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: "Method Not Allowed" };
  }

  try {
    const { id, status } = JSON.parse(e.body || "{}");
    if (!id || !status) throw new Error("Missing id or status");

    // 1. Get current order info
    const { data: order, error: fetchErr } = await s
      .from("orders")
      .select("status, fulfillment_type")
      .eq("id", id)
      .single();

    if (fetchErr || !order) throw new Error("Order not found");

    const currentStatus = order.status;
    const type = order.fulfillment_type || 'delivery'; // Default to delivery

    // 2. Define Valid Transitions
    // We allow moving 'forward' in the chain.
    // Collection: paid -> packed -> collected
    // Delivery: paid -> packed -> out_for_delivery -> delivered

    const validTransitions: Record<string, string[]> = {
      // From 'unpaid', we technically wait for payment, but admin might force 'paid'
      'unpaid': ['paid', 'cancelled'],
      'paid': ['packed', 'cancelled'],
      'packed': type === 'collection' ? ['collected'] : ['out_for_delivery'],
      'out_for_delivery': ['delivered'],
      'collected': [], // End state
      'delivered': [], // End state
      'cancelled': []
    };

    // Allow admin to "Force" status if needed (optional),
    // but for now let's stick to the strict flow or allow same-status updates (to retry webhooks)
    const allowed = validTransitions[currentStatus] || [];
    const isSameStatus = status === currentStatus;

    // Note: You can remove `!allowed.includes(status)` check if you want Admin to have full power
    if (!allowed.includes(status) && !isSameStatus) {
      // Optional: Loose validation to allow fixing mistakes
      console.warn(`Warning: Non-standard transition ${currentStatus} -> ${status}`);
    }

    // 3. Set Timestamps based on Status
    const now = new Date().toISOString();
    const patch: any = { status, updated_at: now };

    if (status === 'paid') patch.paid_at = now; // Manual pay
    if (status === 'packed') patch.order_packed_at = now;

    if (status === 'out_for_delivery') {
      patch.order_out_for_delivery_at = now;
    }

    if (status === 'collected') {
      patch.order_collected_at = now;
      patch.fulfilled_at = now; // Mark as fulfilled
    }

    if (status === 'delivered') {
      patch.order_delivered_at = now;
      patch.fulfilled_at = now; // Mark as fulfilled
    }

    // 4. Update Database
    const { data: updated, error: updateErr } = await s
      .from("orders")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 5. CRITICAL: Deduct stock when order is marked as "paid"
    if (status === 'paid' && currentStatus !== 'paid') {
      console.log(`Deducting stock for order ${id} - marked as paid by admin`);
      const { error: rpcError } = await s.rpc('adjust_stock_for_order', {
        p_order_id: id
      });
      
      if (rpcError) {
        console.error(`ERROR: Failed to deduct stock for order ${id}:`, rpcError.message);
        // Don't throw error here to avoid blocking the status update
      } else {
        console.log(`✅ Stock successfully deducted for order ${id}`);
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: true, order: updated, stockDeducted: status === 'paid' && currentStatus !== 'paid' })
    };

  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};
