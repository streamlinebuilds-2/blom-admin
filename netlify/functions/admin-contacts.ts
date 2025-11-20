// netlify/functions/admin-contacts.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  const url = new URL(e.rawUrl);
  // We can support basic filtering if needed, but instructions say frontend handles sort/search
  // However, we might want to support 'source' filter if the UI sends it.
  
  let q = s.from("contacts").select("*").order("created_at", { ascending: false });

  const { data, error } = await q;

  if (error) return { statusCode: 500, body: error.message };

  return { statusCode: 200, body: JSON.stringify({ data }) };
};
