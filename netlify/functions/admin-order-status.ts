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
              let product: any = null;
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
                  const match = productsByName.find((p: any) => 
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
              
            } catch (itemError: any) {
              console.error(`❌ Error processing item ${item.id}:`, itemError.message);
            }
          }
          
          console.log(`✅ Enhanced stock deduction complete: ${successful}/${orderItems.length} successful, ${fallbackUsed} used fallback`);
        }
        
      } catch (error: any) {
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
        }
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
