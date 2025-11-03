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
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
    }

    // Diagnostic dryRun
    if (body?.dryRun) {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      if (!supabaseUrl || !serviceKey) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server not configured (SUPABASE envs missing)' }) };
      }
      const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
      const { data, error } = await admin.from('products').select('id').limit(1);
      if (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `products select failed: ${error.message}` }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, note: 'products selectable', sample: (data||[]).map((r:any)=>r.id) }) };
    }

    // Validate requireds (name, slug, price)
    const name = String(body.name || '').trim();
    const slug = String(body.slug || '').trim();
    const price = Number(body.price);
    const stock = Number(body.stock ?? 0);

    if (!name || !slug) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing required fields (name, slug)' }) };
    }
    if (!Number.isFinite(price)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid price' }) };
    }
    if (!Number.isFinite(stock)) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid stock' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server not configured (SUPABASE envs missing)' }) };
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const compareAt = body.compare_at_price == null ? null : Number(body.compare_at_price);

    // Map to table schema (write both numeric and *_cents fields, and sync stock variants)
    const row: any = {
      id: body.id ?? undefined,
      name,
      slug,
      status: body.status ?? 'active',
      price: price,
      price_cents: Math.round(price * 100),
      compare_at_price: compareAt,
      compare_at_price_cents: compareAt == null ? null : Math.round(compareAt * 100),
      // sync stock fields commonly present in your schema
      stock: stock,
      stock_on_hand: stock,
      stock_qty: stock,
      // descriptions
      short_description: body.short_description ?? null,
      short_desc: body.short_description ?? null,
      long_description: body.long_description ?? null,
      // images/media
      image_url: body.image_url ?? null,
      gallery: Array.isArray(body.gallery) ? body.gallery : [],
      updated_at: new Date().toISOString(),
      // Additional fields
      ingredients_inci: body.ingredients_inci ?? null,
      variants: Array.isArray(body.variants) ? body.variants : [],
    };

    // Upsert by slug (unique)
    const { data, error } = await admin
      .from('products')
      .upsert(row, { onConflict: 'slug' })
      .select('*')
      .single();

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
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
