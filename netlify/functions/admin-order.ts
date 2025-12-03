import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    // Handle PATCH request for order status updates and archiving
    if (e.httpMethod === 'PATCH') {
      const body = JSON.parse(e.body || '{}');
      const { id, status, archived } = body;

      if (!id) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing order id" }) };
      }

      // Handle archiving
      if (archived !== undefined) {
        console.log('📦 Archiving order:', { id, archived });

        const { data: updatedOrder, error: archiveError } = await s
          .from("orders")
          .update({ 
            archived: archived,
            updated_at: new Date().toISOString()
          })
          .eq("id", id)
          .select()
          .single();

        if (archiveError) {
          throw new Error(`Failed to archive order: ${archiveError.message}`);
        }

        console.log(`✅ Order ${id} ${archived ? 'archived' : 'unarchived'} successfully`);

        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          body: JSON.stringify({ 
            ok: true, 
            order: updatedOrder,
            archived: archived
          })
        };
      }

      // Handle status updates (existing logic)
      if (!status) {
        return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing status" }) };
      }

      console.log('🔄 Updating order status:', { id, status });

      // Get current order status
      const { data: currentOrder, error: fetchError } = await s
        .from("orders")
        .select('status, paid_at')
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch current order: ${fetchError.message}`);
      }

      const oldStatus = currentOrder?.status;
      console.log(`📊 Order ${id} status change: ${oldStatus} → ${status}`);

      // Prepare update data
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Set timestamps based on status
      if (status === 'paid' && oldStatus !== 'paid') {
        updateData.paid_at = new Date().toISOString();
        console.log('💰 Order marked as paid - will trigger stock deduction');
      }
      if (status === 'packed') {
        updateData.order_packed_at = new Date().toISOString();
      }
      if (status === 'out_for_delivery') {
        updateData.order_out_for_delivery_at = new Date().toISOString();
      }
      if (status === 'collected') {
        updateData.order_collected_at = new Date().toISOString();
        updateData.fulfilled_at = new Date().toISOString();
      }
      if (status === 'delivered') {
        updateData.order_delivered_at = new Date().toISOString();
        updateData.fulfilled_at = new Date().toISOString();
      }

      // Update the order
      const { data: updatedOrder, error: updateError } = await s
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update order: ${updateError.message}`);
      }

      console.log('✅ Order status updated successfully');

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ 
          ok: true, 
          order: updatedOrder,
          statusChanged: oldStatus !== status,
          webhookCalled: false,
          webhookOk: false
        })
      };
    }

    // Handle GET request for fetching order details
    const id = new URL(e.rawUrl).searchParams.get("id");
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Missing id" }) };
    }

    // 1. Get Order with specific columns - include all pricing fields and invoice URL
    const { data: order, error: oErr } = await s.from("orders")
      .select(`
        *,
        shipping_address,
        fulfillment_type,
        buyer_name, buyer_email, buyer_phone,
        customer_name, customer_email, customer_phone,
        total_cents, subtotal_cents, shipping_cents, discount_cents,
        total, subtotal, shipping, discount,
        invoice_url
      `)
      .eq("id", id).single();

    if (oErr) throw oErr;

    // 2. Get Items with correct column names - include variant information
    const { data: items, error: iErr } = await s.from("order_items")
      .select(`
        name, product_name, quantity, 
        unit_price_cents, line_total_cents, 
        price, unit_price, line_total,
        variant, sku, product_id
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
    console.error('❌ Order handler error:', err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
