const { createClient } = require("@supabase/supabase-js");

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Force redeploy - Order Status API v1.2
exports.handler = async (e) => {
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

    const validTransitions = {
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
    const patch = { status, updated_at: now };

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
    let stockDeducted = false;
    if (status === 'paid' && currentStatus !== 'paid') {
      console.log(`Deducting stock for order ${id} - marked as paid by admin`);
      
      // Enhanced stock deduction with name-based fallback
      try {
        const { data: orderItems, error: itemsError } = await s
          .from('order_items')
          .select('id, order_id, product_id, name, quantity, unit_price_cents')
          .eq('order_id', id);
          
        if (itemsError) throw new Error(`Failed to fetch order items: ${itemsError.message}`);
        
        if (!orderItems || orderItems.length === 0) {
          console.log(`No items found for order ${id}`);
        } else {
          let fallbackUsed = 0;
          let successful = 0;
          
          for (const item of orderItems) {
            try {
              // Try to find product by ID first, then by name
              let product = null;
              let method = 'failed';
              
              if (item.product_id) {
                const { data: productById } = await s
                  .from('products')
                  .select('id, name, stock, is_active')
                  .eq('id', item.product_id)
                  .single();
                  
                if (productById && productById.is_active) {
                  product = productById;
                  method = 'id';
                }
              }
              
              // Fallback to name matching if ID failed
              if (!product) {
                const normalizedName = item.name.trim().toLowerCase();
                const { data: productsByName } = await s
                  .from('products')
                  .select('id, name, stock, is_active')
                  .eq('is_active', true);
                  
                if (productsByName) {
                  const match = productsByName.find((p) => 
                    p.name.trim().toLowerCase() === normalizedName ||
                    p.name.trim().toLowerCase().includes(normalizedName)
                  );
                  if (match) {
                    product = match;
                    method = 'name';
                    fallbackUsed++;
                  }
                }
              }
              
              if (!product) {
                console.error(`❌ Product not found: ${item.name}`);
                continue;
              }
              
              // Check and update stock
              const { data: currentStock } = await s
                .from('products')
                .select('stock')
                .eq('id', product.id)
                .single();
                
              const stockBefore = currentStock?.stock || 0;
              
              if (stockBefore < item.quantity) {
                console.error(`❌ Insufficient stock for ${product.name}: need ${item.quantity}, have ${stockBefore}`);
                continue;
              }
              
              const newStock = stockBefore - item.quantity;
              const { error: updateError } = await s
                .from('products')
                .update({ 
                  stock: newStock,
                  updated_at: new Date().toISOString()
                })
                .eq('id', product.id);
                
              if (updateError) {
                console.error(`❌ Failed to update stock for ${product.name}: ${updateError.message}`);
                continue;
              }
              
              // Log stock movement
              await s.from('stock_movements').insert({
                product_id: product.id,
                movement_type: 'sale',
                quantity: -item.quantity,
                order_id: id,
                notes: `Stock deducted via ${method} matching`,
                created_at: new Date().toISOString()
              });
              
              console.log(`✅ Stock adjusted: ${product.name} (${item.quantity} units via ${method})`);
              successful++;
              
            } catch (itemError) {
              console.error(`❌ Error processing item ${item.id}:`, itemError.message);
            }
          }
          
          console.log(`✅ Enhanced stock deduction complete: ${successful}/${orderItems.length} successful, ${fallbackUsed} used fallback`);
          stockDeducted = successful > 0;
        }
        
      } catch (error) {
        console.error(`ERROR: Enhanced stock deduction failed for order ${id}:`, error.message);
        
        // Fallback to original RPC method if enhanced method fails
        console.log(`🔄 Trying fallback to original RPC method...`);
        const { error: rpcError } = await s.rpc('adjust_stock_for_order', {
          p_order_id: id
        });
        
        if (rpcError) {
          console.error(`ERROR: Both enhanced and fallback stock deduction failed:`, rpcError.message);
        } else {
          console.log(`✅ Fallback stock deduction successful for order ${id}`);
          stockDeducted = true;
        }
      }
    }

    // 6. CRITICAL: Send status-specific webhook notifications
    console.log(`📡 Sending webhook notifications for order ${id} status change: ${currentStatus} -> ${status}`);
    
    let webhookCalled = false;
    let webhookOk = false;
    let webhookError = null;
    let webhookUrl = null;

    try {
      // Get comprehensive order details for webhook
      const { data: fullOrderData } = await s
        .from('orders')
        .select(`
          id, order_number, buyer_name, buyer_email, buyer_phone, buyer_address,
          shipping_address, delivery_address, status, fulfillment_type, 
          total_cents, subtotal_cents, shipping_cents, discount_cents, 
          created_at, paid_at, order_packed_at, order_out_for_delivery_at,
          order_collected_at, order_delivered_at, notes
        `)
        .eq('id', id)
        .single();

      if (!fullOrderData) {
        throw new Error('Order data not found for webhook');
      }

      const { data: orderItems } = await s
        .from('order_items')
        .select('name, product_name, quantity, unit_price_cents, line_total_cents, variant, sku')
        .eq('order_id', id);

      // Determine webhook URL based on status transition
      const webhookEndpoints = {
        'ready_for_collection': 'https://dockerfile-1n82.onrender.com/webhook/ready-for-collection',
        'ready_for_delivery': 'https://dockerfile-1n82.onrender.com/webhook/ready-for-delivery',
        'out_for_delivery': 'https://dockerfile-1n82.onrender.com/webhook/out-for-delivery'
      };

      // Map status to webhook endpoint
      if (status === 'packed' && fullOrderData.fulfillment_type === 'collection') {
        webhookUrl = webhookEndpoints.ready_for_collection;
      } else if (status === 'packed' && fullOrderData.fulfillment_type === 'delivery') {
        webhookUrl = webhookEndpoints.ready_for_delivery;
      } else if (status === 'out_for_delivery') {
        webhookUrl = webhookEndpoints.out_for_delivery;
      } else {
        console.log(`ℹ️ No specific webhook configured for status: ${status} (${fullOrderData.fulfillment_type})`);
        webhookCalled = false;
        webhookOk = true; // Not an error, just no webhook configured
      }

      if (webhookUrl) {
        // Comprehensive order data for webhook
        const orderData = {
          // Order identification
          order_id: fullOrderData.id,
          order_number: fullOrderData.order_number,
          
          // Customer contact information
          customer_name: fullOrderData.buyer_name,
          customer_email: fullOrderData.buyer_email,
          customer_phone: fullOrderData.buyer_phone,
          customer_address: fullOrderData.buyer_address,
          
          // Delivery information
          shipping_address: fullOrderData.shipping_address,
          delivery_address: fullOrderData.delivery_address,
          fulfillment_type: fullOrderData.fulfillment_type,
          
          // Order status and timing
          current_status: status,
          previous_status: currentStatus,
          status_changed_at: new Date().toISOString(),
          order_created_at: fullOrderData.created_at,
          paid_at: fullOrderData.paid_at,
          order_packed_at: fullOrderData.order_packed_at,
          order_out_for_delivery_at: fullOrderData.order_out_for_delivery_at,
          order_collected_at: fullOrderData.order_collected_at,
          order_delivered_at: fullOrderData.order_delivered_at,
          
          // Financial details
          total_cents: fullOrderData.total_cents,
          total_rands: (fullOrderData.total_cents || 0) / 100,
          subtotal_cents: fullOrderData.subtotal_cents,
          subtotal_rands: (fullOrderData.subtotal_cents || 0) / 100,
          shipping_cents: fullOrderData.shipping_cents,
          shipping_rands: (fullOrderData.shipping_cents || 0) / 100,
          discount_cents: fullOrderData.discount_cents,
          discount_rands: (fullOrderData.discount_cents || 0) / 100,
          
          // Order items
          order_items: (orderItems || []).map(item => ({
            name: item.name,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
            unit_price_rands: (item.unit_price_cents || 0) / 100,
            line_total_cents: item.line_total_cents,
            line_total_rands: (item.line_total_cents || 0) / 100,
            variant: item.variant,
            sku: item.sku
          })),
          
          // Additional details
          notes: fullOrderData.notes,
          
          // System info
          webhook_endpoint: webhookUrl,
          system: 'BLOM-Admin',
          timestamp: new Date().toISOString()
        };

        console.log(`📡 Sending comprehensive webhook to: ${webhookUrl}`);
        console.log(`📦 Order ${fullOrderData.order_number} - ${fullOrderData.buyer_name} (${fullOrderData.buyer_email})`);
        console.log(`📍 ${fullOrderData.fulfillment_type} - Items: ${orderItems?.length || 0}, Total: R${(fullOrderData.total_cents || 0) / 100}`);

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'BLOM-Admin/1.0',
            'X-Order-Status': status,
            'X-Fulfillment-Type': fullOrderData.fulfillment_type
          },
          body: JSON.stringify({
            event: 'order_status_changed',
            webhook_type: 'status_notification',
            timestamp: new Date().toISOString(),
            order: orderData
          })
        });

        webhookCalled = true;
        
        if (webhookResponse.ok) {
          webhookOk = true;
          console.log(`✅ Webhook sent successfully for order ${id} -> ${webhookUrl}`);
        } else {
          const errorText = await webhookResponse.text();
          webhookError = `HTTP ${webhookResponse.status}: ${errorText}`;
          console.error(`❌ Webhook failed for order ${id}:`, webhookError);
        }
      }

      // Send to additional notification webhook if configured
      const notificationUrl = process.env.NOTIFICATION_WEBHOOK_URL;
      if (notificationUrl) {
        try {
          const notificationResponse = await fetch(notificationUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'BLOM-Admin/1.0'
            },
            body: JSON.stringify({
              event: 'order_status_notification',
              timestamp: new Date().toISOString(),
              order_id: id,
              order_number: fullOrderData.order_number,
              customer_name: fullOrderData.buyer_name,
              customer_email: fullOrderData.buyer_email,
              status: status,
              fulfillment_type: fullOrderData.fulfillment_type,
              total_rands: (fullOrderData.total_cents || 0) / 100
            })
          });

          if (notificationResponse.ok) {
            console.log(`✅ Notification webhook sent for order ${id}`);
          } else {
            console.warn(`⚠️ Notification webhook failed for order ${id}: HTTP ${notificationResponse.status}`);
          }
        } catch (notifError) {
          console.warn(`⚠️ Notification webhook error for order ${id}:`, notifError.message);
        }
      }

    } catch (webhookErr) {
      webhookError = webhookErr.message;
      console.error(`❌ Webhook system error for order ${id}:`, webhookErr.message);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        ok: true, 
        order: updated, 
        stockDeducted,
        webhookCalled,
        webhookOk,
        webhookError,
        statusChange: {
          from: currentStatus,
          to: status,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};