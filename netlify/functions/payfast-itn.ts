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
    // 5) Always ACK PayFast quickly
    return { statusCode: 200, body: "OK" };
  } catch (e: any) {
    console.error("ITN handler failed", e);
    // ACK anyway to stop retries (you’ll have the logs)
    return { statusCode: 200, body: "OK (exception logged)" };
  }
};




