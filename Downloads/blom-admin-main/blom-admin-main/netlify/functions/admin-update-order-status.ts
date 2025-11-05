import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) return { statusCode: 500, body: 'Missing Supabase env' };
    const s = createClient(url, key, { auth: { persistSession: false } });

    const body = JSON.parse(event.body || '{}');
    const { order_id, status } = body;

    if (!order_id || !status) {
      return { statusCode: 400, body: 'Missing order_id or status' };
    }

    const { error } = await s
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', order_id);

    if (error) {
      return { statusCode: 500, body: `Update error: ${error.message}` };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, status })
    };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Server error' };
  }
};

