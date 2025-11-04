import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'GET') {
      return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
    }

    const url = new URL(event.rawUrl);
    const id = url.searchParams.get('id');
    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing id parameter' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server not configured' }) };
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await admin
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
    }

    if (!data) {
      return { statusCode: 404, headers, body: JSON.stringify({ ok: false, error: 'Product not found' }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, product: data })
    };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e?.message || String(e) }) };
  }
};

