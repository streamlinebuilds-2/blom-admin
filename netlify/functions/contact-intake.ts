// netlify/functions/contact-intake.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler: Handler = async (e) => {
  if (e.httpMethod === "OPTIONS") return { statusCode: 200, headers: CORS, body: "ok" };
  if (e.httpMethod !== "POST") return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };

  try {
    const payload = JSON.parse(e.body || "{}");

    const name = String(payload.name || "").trim();
    const message = String(payload.message || "").trim();
    if (!name || !message) return { statusCode: 400, headers: CORS, body: "Missing name/message" };

    const row = {
      name,
      email: payload.email ? String(payload.email).trim() : null,
      phone: payload.phone ? String(payload.phone).trim() : null,
      subject: payload.subject ? String(payload.subject).trim() : null,
      message,
      product_slug: payload.product_slug || null,
      order_id: payload.order_id || null,
      source: payload.source || "website",
      images: Array.isArray(payload.images) ? payload.images.map((u:string)=>String(u)) : [],
      meta: payload.meta ?? {},
      status: "new",
    };

    const { data, error } = await s.from("contact_messages").insert(row).select("id").single();

    if (error) return { statusCode: 500, headers: CORS, body: `DB insert failed: ${error.message}` };

    // Optional alerts
    if (process.env.CONTACT_INTAKE_WEBHOOK) {
      fetch(process.env.CONTACT_INTAKE_WEBHOOK, {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ type:"contact_new", id: data.id, ...row })
      }).catch(()=>{});
    }

    if (process.env.CONTACT_NOTIFY_EMAIL) {
      fetch("/.netlify/functions/email-contact-notify", {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ id: data.id, ...row })
      }).catch(()=>{});
    }

    return { statusCode: 200, headers: { ...CORS }, body: JSON.stringify({ ok: true, id: data.id }) };
  } catch (err:any) {
    return { statusCode: 500, headers: CORS, body: `contact-intake exception: ${err?.message || "unknown"}` };
  }
};



