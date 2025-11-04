import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server not configured (SUPABASE envs missing)' }) };
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data, error } = await admin
      .from('bundles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, data: data || [] })
    };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e?.message || String(e) }) };
  }
};

