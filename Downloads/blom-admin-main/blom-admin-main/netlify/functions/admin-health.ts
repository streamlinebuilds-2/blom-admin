import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async () => {
  try {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !key) {
      return { statusCode: 500, body: 'Missing Supabase env' };
    }
    const s = createClient(url, key, { auth: { persistSession: false } });
    const { error } = await s.from('orders').select('id').limit(1);
    if (error) return { statusCode: 502, body: `Supabase error: ${error.message}` };
    return { statusCode: 200, body: 'OK' };
  } catch (e: any) {
    return { statusCode: 500, body: e?.message || 'Error' };
  }
};


