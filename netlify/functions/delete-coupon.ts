import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Helper to get Supabase admin client
const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    console.log('Delete coupon request:', body);

    if (!body.id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing required field: id' })
      };
    }

    const supabase = getSupabaseAdmin();

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('coupons')
      .update({ is_active: false })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, coupon: data })
    };

  } catch (e: any) {
    console.error('Server error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
