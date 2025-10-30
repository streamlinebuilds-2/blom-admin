// Server-only admin orders feed via view `admin_orders_v1`
// Uses Service Role key and never exposes it to the client
import type { Handler } from "@netlify/functions";

export const handler: Handler = async () => {
  try {
    const base = process.env.SUPABASE_URL as string;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    if (!base || !key) {
      return { statusCode: 500, body: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };
    }

    const url = `${base}/rest/v1/admin_orders_v1?select=*&order=created_at.desc&limit=200`;
    const headers: Record<string, string> = {
      apikey: key,
      Authorization: `Bearer ${key}`,
    };

    const r = await fetch(url, { headers });
    if (!r.ok) return { statusCode: r.status, body: await r.text() };

    const text = await r.text();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "access-control-allow-origin": "*" },
      body: text,
    };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || "server_error" };
  }
};

export default handler;


