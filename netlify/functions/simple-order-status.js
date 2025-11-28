/**
 * Simple Order Status Update Function
 * This is a streamlined version focused on just updating order status reliably
 */

import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export const handler = async (e) => {
  if (e.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers: { "Content-Type": "application/json" }, 
      body: "Method Not Allowed" 
    };
  }

  try {
    const { id, status } = JSON.parse(e.body || "{}");
    console.log(`🔄 Order status update - ID: ${id}, Status: ${status}`);
    
    if (!id || !status) {
      console.error("❌ Missing required parameters");
      throw new Error("Missing id or status");
    }

    // Get current order
    console.log(`🔍 Fetching order...`);
    const { data: order, error: fetchError } = await s
      .from("orders")
      .select("id, status, order_number, fulfillment_type")
      .eq("id", id)
      .single();

    if (fetchError || !order) {
      console.error(`❌ Order not found:`, fetchError);
      throw new Error(`Order not found: ${fetchError?.message || 'No error'}`);
    }

    const currentStatus = order.status;
    console.log(`📋 Order ${order.order_number}: ${currentStatus} -> ${status}`);

    // Simple, direct status update
    console.log(`📤 Updating status...`);
    const now = new Date().toISOString();
    const updateData = {
      status: status,
      updated_at: now
    };

    // Add specific timestamps based on status
    if (status === 'packed') updateData.order_packed_at = now;
    if (status === 'out_for_delivery') updateData.order_out_for_delivery_at = now;
    if (status === 'collected' || status === 'delivered') updateData.fulfilled_at = now;

    console.log(`📤 Update data:`, updateData);

    const { data: updated, error: updateError } = await s
      .from("orders")
      .update(updateData)
      .eq("id", id)
      .select("id, status, updated_at, order_packed_at, order_out_for_delivery_at, fulfilled_at")
      .single();

    if (updateError) {
      console.error(`❌ Update failed:`, updateError);
      throw new Error(`Update failed: ${updateError.message}`);
    }

    console.log(`✅ Status updated successfully`);
    console.log(`📦 Updated order:`, updated);

    // Send webhook for status changes
    let webhookResult = { called: false, ok: false, error: null };
    
    if (status === 'packed' || status === 'out_for_delivery') {
      console.log(`📡 Sending webhook...`);
      try {
        const webhookUrl = status === 'packed' && order.fulfillment_type === 'collection'
          ? 'https://dockerfile-1n82.onrender.com/webhook/ready-for-collection'
          : status === 'packed' && order.fulfillment_type === 'delivery'
          ? 'https://dockerfile-1n82.onrender.com/webhook/ready-for-delivery'
          : status === 'out_for_delivery'
          ? 'https://dockerfile-1n82.onrender.com/webhook/out-for-delivery'
          : null;

        if (webhookUrl) {
          const webhookPayload = {
            event: 'order_status_changed',
            timestamp: new Date().toISOString(),
            order: {
              order_id: order.id,
              order_number: order.order_number,
              previous_status: currentStatus,
              new_status: status,
              status_changed_at: now
            }
          };

          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
          });

          webhookResult.called = true;
          webhookResult.ok = response.ok;
          
          if (!response.ok) {
            const errorText = await response.text();
            webhookResult.error = `HTTP ${response.status}: ${errorText}`;
            console.error(`❌ Webhook failed:`, webhookResult.error);
          } else {
            console.log(`✅ Webhook sent successfully`);
          }
        }
      } catch (webhookError) {
        webhookResult.called = true;
        webhookResult.ok = false;
        webhookResult.error = webhookError.message;
        console.error(`❌ Webhook error:`, webhookError);
      }
    }

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json", 
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({ 
        ok: true, 
        order: updated,
        updateMethod: 'simple_direct_update',
        webhook: webhookResult,
        statusChange: {
          from: currentStatus,
          to: status,
          timestamp: now
        },
        debug: {
          orderId: id,
          orderNumber: order.order_number,
          updateSuccess: true,
          webhookCalled: webhookResult.called,
          webhookOk: webhookResult.ok
        }
      })
    };

  } catch (err) {
    console.error("💥 Order status update failed:", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ok: false, 
        error: err.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};