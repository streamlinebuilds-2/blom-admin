// netlify/functions/moderate-contact.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  if (e.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const { id, action } = JSON.parse(e.body || "{}"); // action: 'handled'|'spam'|'new'

  if (!id || !['handled','spam','new'].includes(action)) return { statusCode: 400, body: "Bad payload" };

  const { error } = await s.from("contact_messages").update({ status: action }).eq("id", id);

  if (error) return { statusCode: 500, body: error.message };

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};

