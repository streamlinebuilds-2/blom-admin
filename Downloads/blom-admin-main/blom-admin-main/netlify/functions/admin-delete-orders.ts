import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Deletes ALL orders except those whose order_number or m_payment_id are in the keep list.
// Body: { keep: string[], dryRun?: boolean }
// WARNING: This is destructive. Keep behind admin auth or call manually.
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) return { statusCode: 500, body: 'Missing Supabase env' };
    const s = createClient(url, key, { auth: { persistSession: false } });

    const body = event.body ? JSON.parse(event.body) : {};
    const keep: string[] = Array.isArray(body.keep) ? body.keep : [];
    const dryRun: boolean = !!body.dryRun;

    if (!keep.length) return { statusCode: 400, body: 'Provide keep: string[]' };

    // Find ids to delete: orders where BOTH order_number and m_payment_id are NOT in keep
    const { data: candidates, error: selErr } = await s
      .from('orders')
      .select('id,order_number,m_payment_id')
      .not('order_number', 'in', `(${keep.map(k => `'${k}'`).join(',') || "''"})`)
      .not('m_payment_id', 'in', `(${keep.map(k => `'${k}'`).join(',') || "''"})`)
      .limit(10000);

    if (selErr) return { statusCode: 502, body: `Select error: ${selErr.message}` };
    const ids = (candidates || []).map((r: any) => r.id);

    if (dryRun) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, dryRun: true, willDelete: ids.length, ids: ids.slice(0, 50) }) };
    }

    if (ids.length === 0) return { statusCode: 200, body: JSON.stringify({ ok: true, deleted: 0 }) };

    const { error: delErr } = await s.from('orders').delete().in('id', ids);
    if (delErr) return { statusCode: 502, body: `Delete error: ${delErr.message}` };

    return { statusCode: 200, body: JSON.stringify({ ok: true, deleted: ids.length }) };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Server error' };
  }
};


