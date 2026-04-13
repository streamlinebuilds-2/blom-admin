import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
    }
    if (!event.body) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Empty body' }) };
    }

    let body: any;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
    }

    const bundle = body.bundle || body;

    const name = String(bundle.name || '').trim();
    const slug = String(bundle.slug || '').trim();
    if (!name || !slug) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Name and slug are required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server not configured' }) };
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const price = Number(bundle.price || 0);
    const compareAt = bundle.compare_at_price ? Number(bundle.compare_at_price) : null;

    const row: any = {
      name,
      slug,
      status: bundle.status || 'active',
      price_cents: Math.round(price * 100),
      compare_at_price_cents: compareAt != null ? Math.round(compareAt * 100) : null,
      short_desc: bundle.short_description || null,
      long_desc: bundle.long_description || null,
      images: Array.isArray(bundle.images) ? bundle.images : [],
      hover_image: bundle.hover_image || null,
      bundle_products: Array.isArray(bundle.bundle_products) ? bundle.bundle_products : [],
      updated_at: new Date().toISOString(),
    };

    let data, error;
    if (bundle.id) {
      const { data: updated, error: updateError } = await admin
        .from('bundles')
        .update(row)
        .eq('id', bundle.id)
        .select('*')
        .single();
      data = updated;
      error = updateError;
    } else {
      const { data: inserted, error: insertError } = await admin
        .from('bundles')
        .insert(row)
        .select('*')
        .single();
      data = inserted;
      error = insertError;
    }

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, bundle: data })
    };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e?.message || String(e) }) };
  }
};
