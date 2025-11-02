// netlify/functions/admin-contacts.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  const url = new URL(e.rawUrl);
  const status = url.searchParams.get("status"); // new/handled/spam or null

  let q = s.from("contact_messages").select("id,created_at,status,name,email,phone,subject,source").order("created_at",{ascending:false});

  if (status) q = q.eq("status", status);

  const { data, error } = await q;

  if (error) return { statusCode: 500, body: error.message };

  return { statusCode: 200, body: JSON.stringify({ data }) };
};



