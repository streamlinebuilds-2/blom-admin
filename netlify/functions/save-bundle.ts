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

    let body: any;
    try {
      body = typeof event.body === 'string' ? (event.body ? JSON.parse(event.body) : {}) : (event.body || {});
    } catch (e) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON: ' + (e instanceof Error ? e.message : String(e)) }) };
    }

    const name = String(body.name || '').trim();
    const slug = String(body.slug || '').trim();
    const price = Number(body.price);
    const status = body.status || 'active';

    if (!name || !slug) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing required fields (name, slug)' }) };
    }
    if (!Number.isFinite(price)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid price' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server not configured (SUPABASE envs missing)' }) };
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const compareAt = body.compare_at_price == null ? null : Number(body.compare_at_price);

    const row: any = {
      id: body.id ?? undefined,
      name,
      slug,
      status,
      price_cents: Math.round(price * 100),
      compare_at_price_cents: compareAt == null ? null : Math.round(compareAt * 100),
      short_desc: body.short_description ?? null,
      short_description: body.short_description ?? null,
      long_desc: body.long_description ?? null,
      long_description: body.long_description ?? null,
      images: Array.isArray(body.images) ? body.images : [],
      hover_image: body.hover_image ?? null,
      updated_at: new Date().toISOString(),
    };

    let data, error;
    if (row.id) {
      const { data: updated, error: updateError } = await admin
        .from('bundles')
        .update(row)
        .eq('id', row.id)
        .select('*')
        .single();
      data = updated;
      error = updateError;
    } else {
      const { data: existing } = await admin
        .from('bundles')
        .select('id')
        .eq('slug', row.slug)
        .maybeSingle();

      if (existing) {
        const { data: updated, error: updateError } = await admin
          .from('bundles')
          .update(row)
          .eq('id', existing.id)
          .select('*')
          .single();
        data = updated;
        error = updateError;
      } else {
        delete row.id;
        const { data: inserted, error: insertError } = await admin
          .from('bundles')
          .insert(row)
          .select('*')
          .single();
        data = inserted;
        error = insertError;
      }
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

