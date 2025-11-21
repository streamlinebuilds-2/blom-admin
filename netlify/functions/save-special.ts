import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
    }
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Empty body' }) };
    }

    // Parse body defensively
    let body: any;
    try {
      body = typeof event.body === 'string'
        ? (event.body ? JSON.parse(event.body) : {})
        : (event.body || {});
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON: ' + (e instanceof Error ? e.message : String(e)) }) };
    }

    // Unwrap payload if wrapped
    if (body.payload) {
      body = body.payload;
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server not configured (SUPABASE envs missing)' }) };
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Validate required fields
    const title = String(body.title || '').trim();
    const starts_at = body.starts_at;
    const ends_at = body.ends_at;
    const scope = body.scope || 'product';
    const discount_type = body.discount_type || 'percent';
    const discount_value = Number(body.discount_value);

    if (!title || !starts_at || !ends_at || !discount_value) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing required fields (title, starts_at, ends_at, discount_value)' }) };
    }

    if (!Number.isFinite(discount_value)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid discount value' }) };
    }

    // Validate discount type
    const validDiscountTypes = ['percent', 'amount_off', 'fixed_price'];
    if (!validDiscountTypes.includes(discount_type)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid discount type' }) };
    }

    // Validate scope
    const validScopes = ['product', 'bundle', 'sitewide'];
    if (!validScopes.includes(scope)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid scope' }) };
    }

    // Prepare special data
    const specialData: any = {
      title,
      starts_at,
      ends_at,
      scope,
      discount_type,
      discount_value,
      status: body.status || 'active',
      target_ids: Array.isArray(body.target_ids) ? body.target_ids : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let result;
    if (body.id) {
      // Update existing special
      const { data, error } = await admin
        .from('specials')
        .update({ ...specialData, id: body.id })
        .eq('id', body.id)
        .select('*')
        .single();
      
      if (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
      }
      result = data;
    } else {
      // Create new special
      const { data, error } = await admin
        .from('specials')
        .insert([specialData])
        .select('*')
        .single();
      
      if (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
      }
      result = data;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, special: result })
    };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e?.message || String(e) }) };
  }
};