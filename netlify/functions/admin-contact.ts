// netlify/functions/admin-contact.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  const url = new URL(e.rawUrl);
  const id = url.searchParams.get("id");

  if (!id) return { statusCode: 400, body: "Missing id" };

  const { data, error } = await s.from("contact_messages").select("*").eq("id", id).single();

  if (error) return { statusCode: 500, body: error.message };

  return { statusCode: 200, body: JSON.stringify({ data }) };
};

