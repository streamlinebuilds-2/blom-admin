// netlify/functions/contacts-intake.ts
// Public endpoint for adding contacts from frontend (beauty club signup, account creation)
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const handler: Handler = async (e) => {
  if (e.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS, body: "ok" };
  }

  if (e.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS, body: "Method Not Allowed" };
  }

  try {
    const payload = JSON.parse(e.body || "{}");

    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) {
      return { statusCode: 400, headers: CORS, body: "Email is required" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { statusCode: 400, headers: CORS, body: "Invalid email format" };
    }

    // Validate source
    const validSources = ["beauty_club_signup", "account_creation", "order"];
    const source = payload.source || "beauty_club_signup";
    if (!validSources.includes(source)) {
      return { statusCode: 400, headers: CORS, body: "Invalid source" };
    }

    const row = {
      name: payload.name ? String(payload.name).trim() : null,
      email,
      phone: payload.phone ? String(payload.phone).trim() : null,
      source,
      notes: payload.notes ? String(payload.notes).trim() : null,
      subscribed: true,
    };

    // Use upsert to handle duplicates gracefully
    const { data, error } = await s.rpc("upsert_contact", {
      p_name: row.name,
      p_email: row.email,
      p_phone: row.phone,
      p_source: row.source,
      p_notes: row.notes,
    });

    if (error) {
      return { statusCode: 500, headers: CORS, body: `DB insert failed: ${error.message}` };
    }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ ok: true, id: data }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS,
      body: `contacts-intake exception: ${err?.message || "unknown"}`,
    };
  }
};
