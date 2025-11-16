// netlify/functions/payfast-itn.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import * as crypto from "crypto";

// --- ENV you must have in Netlify ---
// SUPABASE_URL
// SUPABASE_SERVICE_ROLE_KEY
// PAYFAST_PASSPHRASE  (exactly what you set in PayFast account)

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE || "";

// Helpers
function parseFormUrlEncoded(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of body.split("&")) {
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent((v || "").replace(/\+/g, " "));
  }
  return out;
}

/**
 * Decrements stock for all items in an order.
 * Handles regular products and unpacks bundles.
 */
async function updateStockForOrder(orderId: string, supabase: any) {
  try {
    console.log(`Updating stock for order: ${orderId}`);

    // 1. Get all order items
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);

    if (itemsError) throw new Error(`Failed to fetch order_items: ${itemsError.message}`);
    if (!orderItems || orderItems.length === 0) {
      console.warn(`No order items found for order ${orderId}, skipping stock update.`);
      return;
    }

    // 2. Get the product details for all items
    const productIds = orderItems.map((item: any) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, product_type, bundle_products')
      .in('id', productIds);

    if (productsError) throw new Error(`Failed to fetch products: ${productsError.message}`);

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    // 3. Loop through each order item and build a list of stock adjustments
    const stockAdjustments = new Map<string, number>();

    for (const item of orderItems) {
      const product = productMap.get(item.product_id);
      if (!product) {
        console.warn(`Product ${item.product_id} not found, skipping stock.`);
        continue;
      }

      const itemQuantity = parseInt(item.qty) || 0;

      if (product.product_type === 'bundle' && product.bundle_products) {
        // This is a bundle, unpack it
        console.log(`Item ${item.name} is a bundle. Unpacking components.`);
        for (const component of product.bundle_products) {
          const componentProductId = component.product_id;
          const componentQuantityInBundle = parseInt(component.quantity) || 0;

          // Total to reduce = (component qty) * (number of bundles ordered)
          const quantityToReduce = componentQuantityInBundle * itemQuantity;

          if (quantityToReduce > 0) {
            const current = stockAdjustments.get(componentProductId) || 0;
            stockAdjustments.set(componentProductId, current + quantityToReduce);
          }
        }
      } else {
        // This is a regular product
        console.log(`Item ${item.name} is a regular product.`);
        const current = stockAdjustments.get(item.product_id) || 0;
        stockAdjustments.set(item.product_id, current + itemQuantity);
      }
    }

    console.log('Calculated stock adjustments:', Object.fromEntries(stockAdjustments));

    // 4. Execute all stock adjustments by calling the RPC
    const stockMovementLogs: Array<{
      product_id: string;
      product_name: string;
      quantity_change: number;
      reason: string;
      order_id: string;
    }> = [];

    for (const [product_id, quantity] of stockAdjustments.entries()) {
      if (quantity > 0) {
        console.log(`Adjusting stock for ${product_id} by -${quantity}`);
        const { error: rpcError } = await supabase.rpc('adjust_stock', {
          product_uuid: product_id,
          quantity_to_reduce: quantity
        });

        if (rpcError) {
          console.error(`Failed to adjust stock for ${product_id}:`, rpcError);
        }

        // Prepare the log entry
        const productName = productMap.get(product_id)?.name || product_id;
        stockMovementLogs.push({
          product_id: product_id,
          product_name: productName,
          quantity_change: -quantity, // Log as a negative number
          reason: 'order',
          order_id: orderId
        });
      }
    }

    // 5. Insert all stock movement logs in one batch
    if (stockMovementLogs.length > 0) {
      console.log('Logging stock movements:', stockMovementLogs);
      const { error: logError } = await supabase
        .from('stock_movements')
        .insert(stockMovementLogs);

      if (logError) {
        console.error('Failed to log stock movements:', logError.message);
      }
    }

    console.log(`Stock update complete for order: ${orderId}`);

  } catch (error: any) {
    console.error(`CRITICAL: Failed to update stock for order ${orderId}:`, error.message);
    // Log error but don't throw - we don't want to fail the ITN response
  }
}

// PayFast signature: md5 of querystring (sorted) + passphrase if set
function computeSignature(fields: Record<string, string>): string {
  // Exclude 'signature' itself
  const clean: Record<string, string> = {};
  Object.keys(fields)
    .filter((k) => k.toLowerCase() !== "signature")
    .sort()
    .forEach((k) => (clean[k] = fields[k]));

  // Build string
  const qs = Object.entries(clean)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  // Append passphrase if present
  const payload = PASSPHRASE ? `${qs}&passphrase=${encodeURIComponent(PASSPHRASE)}` : qs;

  // PayFast uses MD5 hash
  return crypto.createHash("md5").update(payload).digest("hex");
}

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // PayFast sends form-urlencoded
    const raw = event.body || "";
    const data = parseFormUrlEncoded(raw);

    // 1) Verify signature
    const theirSig = (data.signature || "").toLowerCase();
    const ourSig = computeSignature(data);
    if (!theirSig || theirSig !== ourSig) {
      console.warn("Invalid signature", { theirSig, ourSig });
      return { statusCode: 400, body: "Invalid signature" };
    }

    // 2) Only act on COMPLETE
    const status = (data.payment_status || "").toUpperCase();
    if (status !== "COMPLETE") {
      // still ack to avoid retries; do nothing
      return { statusCode: 200, body: "OK (not complete)" };
    }

    // 3) m_payment_id must be your internal order id (UUID or string)
    const orderId = data.m_payment_id;
    if (!orderId) return { statusCode: 400, body: "Missing m_payment_id" };

    // 4) Apply stock + sales via RPC (idempotent)
    const { data: rpc, error } = await s.rpc("apply_paid_order", { p_order_id: orderId });
    if (error) {
      console.error("apply_paid_order error", error);
      // Still return 200 to avoid PayFast retries — you may alert internally
      return { statusCode: 200, body: "OK (rpc failed, logged)" };
    }

    console.log("apply_paid_order ok", rpc);

    // 5) Update stock for bundles and regular products
    await updateStockForOrder(orderId, s);

    // 6) Always ACK PayFast quickly
    return { statusCode: 200, body: "OK" };
  } catch (e: any) {
    console.error("ITN handler failed", e);
    // ACK anyway to stop retries (you’ll have the logs)
    return { statusCode: 200, body: "OK (exception logged)" };
  }
};




