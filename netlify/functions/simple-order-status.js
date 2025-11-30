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

    // Use the dedicated RPC function for reliable status updates
    console.log(`📤 Using RPC function for status update...`);
    const now = new Date().toISOString();
    
    // Use the RPC function that was created in the migration
    const { data: updated, error: updateError } = await s
      .rpc('update_order_status', {
        p_order_id: id,
        p_new_status: status,
        p_timestamp: now
      })
      .single();

    if (updateError) {
      console.error(`❌ RPC update failed:`, updateError);
      console.log(`🔄 Trying direct update as fallback...`);
      
      // Fallback: direct update if RPC fails
      const updateData = {
        status: status,
        updated_at: now
      };

      // Add specific timestamps based on status
      if (status === 'packed') updateData.order_packed_at = now;
      if (status === 'out_for_delivery') updateData.order_out_for_delivery_at = now;
      if (status === 'collected' || status === 'delivered') updateData.fulfilled_at = now;

      console.log(`📤 Fallback update data:`, updateData);

      const { data: directUpdated, error: directError } = await s
        .from("orders")
        .update(updateData)
        .eq("id", id)
        .select("id, status, updated_at, order_packed_at, order_out_for_delivery_at, fulfilled_at")
        .single();

      if (directError) {
        console.error(`❌ Direct update also failed:`, directError);
        throw new Error(`Both RPC and direct update failed: ${directError.message}`);
      }

      console.log(`✅ Direct update successful`);
      console.log(`📦 Directly updated order:`, directUpdated);
      
      // Use the directly updated data
      var updated = directUpdated;
    } else {
      console.log(`✅ RPC status update successful`);
      console.log(`📦 RPC updated order:`, updated);
    }

    // Verify the status was actually updated
    console.log(`🔍 Verifying status update...`);
    const { data: verifyOrder, error: verifyError } = await s
      .from("orders")
      .select("id, status, updated_at")
      .eq("id", id)
      .single();

    if (verifyError) {
      console.error(`❌ Verification failed:`, verifyError);
      throw new Error(`Status verification failed: ${verifyError.message}`);
    }

    if (verifyOrder.status !== status) {
      console.error(`❌ Status verification failed! Expected: ${status}, Got: ${verifyOrder.status}`);
      throw new Error(`Status verification failed! Expected: ${status}, Got: ${verifyOrder.status}`);
    }

    console.log(`✅ Status update verified: ${currentStatus} -> ${verifyOrder.status}`);

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
        updateMethod: updateError ? 'rpc_with_fallback' : 'rpc_direct',
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
          webhookOk: webhookResult.ok,
          verificationPassed: verifyOrder.status === status
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