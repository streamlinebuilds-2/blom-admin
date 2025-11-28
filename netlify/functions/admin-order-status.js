import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Force redeploy - Order Status API v1.2
export const handler = async (e) => {
  if (e.httpMethod !== "POST") {
    return { statusCode: 405, headers: { "Content-Type": "application/json" }, body: "Method Not Allowed" };
  }

  try {
    const { id, status } = JSON.parse(e.body || "{}");
    console.log(`🔄 Order status update requested - ID: ${id}, Status: ${status}`);
    
    if (!id || !status) {
      console.error("❌ Missing required parameters:", { id, status });
      throw new Error("Missing id or status");
    }

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
    console.log(`📤 Updating order ${id} - Current: ${currentStatus}, New: ${status}`);
    console.log(`📤 Update patch:`, JSON.stringify(patch, null, 2));
    
    const { data: updated, error: updateErr } = await s
      .from("orders")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    console.log(`📤 Database update result - Data:`, JSON.stringify(updated, null, 2));
    console.log(`📤 Database update result - Error:`, updateErr);

    if (updateErr) {
      console.error(`❌ Database update failed:`, updateErr);
      throw updateErr;
    }

    console.log(`✅ Order ${id} successfully updated to ${status}`);

    // 5. CRITICAL: Enhanced Stock Deduction + Analytics Update using Product Mapping System
    let stockProcessingResults = {
      itemsProcessed: 0,
      itemsSuccessful: 0,
      itemsFailed: 0,
      stockDeducted: false,
      analyticsUpdated: false,
      errors: []
    };

    if (status === 'paid' && currentStatus !== 'paid') {
      console.log(`💰 Processing paid order ${id} - Enhanced stock deduction + Analytics using mapping system`);
      
      try {
        // Get order items
        const { data: orderItems, error: itemsError } = await s
          .from('order_items')
          .select('id, order_id, product_id, name, quantity, unit_price_cents, line_total_cents')
          .eq('order_id', id);
          
        if (itemsError) {
          throw new Error(`Failed to fetch order items: ${itemsError.message}`);
        }
        
        if (!orderItems || orderItems.length === 0) {
          console.log(`⚠️ No items found for order ${id}`);
        } else {
          console.log(`📦 Processing ${orderItems.length} items with enhanced product mapping`);

          // Process each item using the enhanced matching system
          for (const item of orderItems) {
            try {
              console.log(`🔍 Processing item: ${item.name} (Qty: ${item.quantity})`);

              // Use the enhanced mapping function
              const { data: matchResult, error: matchError } = await s
                .rpc('find_product_match', { order_product_name: item.name });

              if (matchError) {
                console.error(`❌ Matching failed for ${item.name}:`, matchError);
                stockProcessingResults.errors.push(`Matching failed: ${item.name} - ${matchError.message}`);
                stockProcessingResults.itemsFailed++;
                continue;
              }

              if (!matchResult || !matchResult[0]?.found) {
                console.error(`❌ No product match found for: ${item.name}`);
                stockProcessingResults.errors.push(`No match found: ${item.name}`);
                stockProcessingResults.itemsFailed++;
                continue;
              }

              const match = matchResult[0];
              const productId = match.product_id;
              const productName = match.product_name;
              const method = match.method;
              const confidence = match.confidence;

              console.log(`✅ Match found: "${item.name}" -> "${productName}" (${method}, ${(confidence * 100).toFixed(1)}% confidence)`);

              // Check current stock
              const { data: currentStock } = await s
                .from('products')
                .select('stock, stock_qty')
                .eq('id', productId)
                .single();

              if (!currentStock) {
                console.error(`❌ Could not retrieve stock for product: ${productName}`);
                stockProcessingResults.errors.push(`Stock check failed: ${productName}`);
                stockProcessingResults.itemsFailed++;
                continue;
              }

              const currentStockLevel = currentStock.stock_qty || currentStock.stock || 0;
              
              if (currentStockLevel < item.quantity) {
                const errorMsg = `Insufficient stock for ${productName}: have ${currentStockLevel}, need ${item.quantity}`;
                console.error(`❌ ${errorMsg}`);
                stockProcessingResults.errors.push(errorMsg);
                stockProcessingResults.itemsFailed++;
                continue;
              }

              // Deduct stock
              const newStockLevel = currentStockLevel - item.quantity;

              const { error: updateError } = await s
                .from('products')
                .update({
                  stock: newStockLevel,
                  stock_qty: newStockLevel,
                  updated_at: new Date().toISOString()
                })
                .eq('id', productId);

              if (updateError) {
                console.error(`❌ Stock update failed for ${productName}:`, updateError);
                stockProcessingResults.errors.push(`Stock update failed: ${productName} - ${updateError.message}`);
                stockProcessingResults.itemsFailed++;
                continue;
              }

              // Create detailed stock movement
              const { data: orderData } = await s
                .from('orders')
                .select('order_number')
                .eq('id', id)
                .single();

              await s.from('stock_movements').insert({
                product_id: productId,
                movement_type: 'sale',
                quantity: -item.quantity,
                order_id: id,
                order_item_id: item.id,
                matching_method: method,
                confidence_score: confidence,
                notes: `Order ${orderData?.order_number || id} - "${item.name}" matched to "${productName}" via ${method} (${(confidence * 100).toFixed(1)}% confidence)`,
                created_at: new Date().toISOString()
              });

              console.log(`✅ Stock deducted: ${productName} (-${item.quantity}, new stock: ${newStockLevel}) via ${method}`);
              stockProcessingResults.itemsSuccessful++;
              stockProcessingResults.itemsProcessed++;

            } catch (itemError) {
              const errorMsg = `Error processing item ${item.id} (${item.name}): ${itemError.message}`;
              console.error(`❌ ${errorMsg}`, itemError);
              stockProcessingResults.errors.push(errorMsg);
              stockProcessingResults.itemsFailed++;
            }
          }

          // Update analytics if we had successful stock deductions
          if (stockProcessingResults.itemsSuccessful > 0) {
            try {
              console.log(`📊 Updating sales analytics for order ${id}...`);

              // Get order details for analytics
              const { data: orderForAnalytics } = await s
                .from('orders')
                .select('id, order_number, created_at, total_cents')
                .eq('id', id)
                .single();

              if (orderForAnalytics) {
                const { data: itemsForAnalytics } = await s
                  .from('order_items')
                  .select('name, quantity, line_total_cents')
                  .eq('order_id', id);

                if (itemsForAnalytics && itemsForAnalytics.length > 0) {
                  // Update daily sales
                  const orderDate = new Date(orderForAnalytics.created_at).toISOString().split('T')[0];
                  const totalRevenue = itemsForAnalytics.reduce((sum, item) => sum + (item.line_total_cents || 0), 0);
                  const totalUnits = itemsForAnalytics.reduce((sum, item) => sum + (item.quantity || 0), 0);

                  await s.from('daily_sales').upsert({
                    date: orderDate,
                    total_sales_cents: totalRevenue,
                    total_orders: 1,
                    total_items_sold: totalUnits,
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'date'
                  });

                  // Update product sales stats
                  const productSales = new Map();
                  
                  for (const item of itemsForAnalytics) {
                    const productName = item.name;
                    if (!productSales.has(productName)) {
                      productSales.set(productName, {
                        name: productName,
                        quantity: 0,
                        revenue: 0,
                        orders: new Set()
                      });
                    }
                    
                    const stats = productSales.get(productName);
                    stats.quantity += item.quantity || 0;
                    stats.revenue += item.line_total_cents || 0;
                    stats.orders.add(id);
                  }

                  // Insert/update each product's stats
                  for (const [productName, stats] of productSales.entries()) {
                    await s.from('product_sales_stats').upsert({
                      product_name: productName,
                      total_quantity_sold: stats.quantity,
                      total_revenue_cents: stats.revenue,
                      order_count: stats.orders.size,
                      last_sold_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'product_name'
                    });
                  }

                  stockProcessingResults.analyticsUpdated = true;
                  console.log(`✅ Analytics updated: ${productSales.size} products, R${totalRevenue/100}, ${totalUnits} units`);
                }
              }
            } catch (analyticsError) {
              console.error(`❌ Analytics update failed for order ${id}:`, analyticsError);
              stockProcessingResults.errors.push(`Analytics failed: ${analyticsError.message}`);
            }
          }

          stockProcessingResults.stockDeducted = stockProcessingResults.itemsSuccessful > 0;
          console.log(`✅ Enhanced processing complete: ${stockProcessingResults.itemsSuccessful}/${orderItems.length} successful`);

        }
      } catch (processingError) {
        console.error(`❌ Order processing failed for ${id}:`, processingError);
        stockProcessingResults.errors.push(`Processing failed: ${processingError.message}`);
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
      console.log(`📡 Fetching order data for webhook...`);
      const { data: fullOrderData, error: webhookOrderError } = await s
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

      console.log(`📡 Webhook order fetch result:`, { fullOrderData, webhookOrderError });

      if (webhookOrderError) {
        console.error(`❌ Failed to fetch order data for webhook:`, webhookOrderError);
        throw new Error(`Webhook order fetch failed: ${webhookOrderError.message}`);
      }

      if (!fullOrderData) {
        console.error(`❌ No order data found for webhook`);
        throw new Error('Order data not found for webhook');
      }

      const { data: orderItems, error: itemsFetchError } = await s
        .from('order_items')
        .select('name, product_name, quantity, unit_price_cents, line_total_cents, variant, sku')
        .eq('order_id', id);

      console.log(`📡 Order items fetch result:`, { orderItems, itemsFetchError });

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
        stockProcessing: stockProcessingResults,
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