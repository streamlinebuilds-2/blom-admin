import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

function sign(fields, passphrase) {
  const pairs = Object.entries(fields)
    .filter(([,v]) => v !== undefined && v !== null && v !== "")
    .map(([k,v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, "+")}`)
    .sort();
  let str = pairs.join("&");
  if (passphrase) str += `&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, "+")}`;
  return crypto.createHash("md5").update(str).digest("hex");
}

function validateIP(ip) {
  const validHosts = [
    "www.payfast.co.za",
    "sandbox.payfast.co.za",
    "w1w.payfast.co.za",
    "w2w.payfast.co.za",
  ];
  // In production, validate IP properly
  // For now, accept all (add proper IP validation later)
  return true;
}

export const handler = async (event) => {
  try {
    // Parse PayFast POST data
    const body = querystring.parse(event.body);
    const { signature, ...fields } = body;

    // 1. Validate signature
    const expectedSig = sign(fields, process.env.PAYFAST_PASSPHRASE);
    if (signature !== expectedSig) {
      console.error("Invalid signature");
      return { statusCode: 400, body: "Invalid signature" };
    }

    // 2. Validate IP (you should implement this properly)
    const clientIP = event.headers["x-forwarded-for"] || event.headers["client-ip"];
    if (!validateIP(clientIP)) {
      console.error("Invalid IP:", clientIP);
      return { statusCode: 403, body: "Forbidden" };
    }

    // 3. Check payment_status
    if (fields.payment_status !== "COMPLETE") {
      console.log("Payment not complete:", fields.payment_status);
      return { statusCode: 200, body: "OK - not complete" };
    }

    // 4. Get order from custom_str1 (order_id)
    const orderId = fields.custom_str1;
    if (!orderId) {
      console.error("No order_id in custom_str1");
      return { statusCode: 400, body: "Missing order_id" };
    }

    // 5. Update order in Supabase
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (orderError) {
      console.error("Error updating order:", orderError);
      return { statusCode: 500, body: "Database error" };
    }

    // 6. Create payment record
    const { error: paymentError } = await supabase
      .from("payments")
      .insert({
        order_id: orderId,
        provider: "payfast",
        amount_cents: Math.round(parseFloat(fields.amount_gross) * 100),
        status: "succeeded",
        raw: fields,
        created_at: new Date().toISOString(),
      });

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      // Order is already marked paid, so just log the error
    }

    // 7. Adjust Stock
    const { error: rpcError } = await supabase.rpc('adjust_stock_for_order', {
      p_order_id: orderId
    });
    if (rpcError) {
      console.error(`Error triggering stock adjustment RPC for ${orderId}:`, rpcError.message);
    }

    console.log(`✓ Order ${orderId} marked paid via PayFast`);
    return { statusCode: 200, body: "OK" };
  } catch (e) {
    console.error("ITN error:", e);
    return { statusCode: 500, body: "Server error" };
  }
};


