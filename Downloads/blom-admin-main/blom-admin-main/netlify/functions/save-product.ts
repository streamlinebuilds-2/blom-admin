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

    // Support both { product: {...} } and direct product object
    const product = body.product || body;

    // Diagnostic dryRun
    if (product?.dryRun) {
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
    const name = String(product.name || '').trim();
    const slug = String(product.slug || '').trim();
    const price = Number(product.price);
    const stock = Number(product.stock ?? 0);

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

    const compareAt = product.compare_at_price == null ? null : Number(product.compare_at_price);

    // Map to table schema (write both numeric and *_cents fields, and sync stock variants)
    const row: any = {
      id: product.id ?? undefined,
      name,
      subtitle: product.subtitle ?? null,
      slug,
      status: product.status ?? 'active',
      category: product.category ?? null,
      tags: Array.isArray(product.tags) ? product.tags : [],
      badges: Array.isArray(product.badges) ? product.badges : [],
      claims: Array.isArray(product.claims) ? product.claims : [],
      price: price,
      price_cents: Math.round(price * 100),
      compare_at_price: compareAt,
      compare_at_price_cents: compareAt == null ? null : Math.round(compareAt * 100),
      // sync stock fields commonly present in your schema
      stock: stock,
      stock_on_hand: stock,
      stock_qty: stock,
      // descriptions
      short_description: product.short_description ?? null,
      short_desc: product.short_description ?? null,
      long_description: product.long_description ?? null,
      how_to_use: product.how_to_use ?? null,
      size: product.size ?? null,
      shelf_life: product.shelf_life ?? null,
      features: Array.isArray(product.features) ? product.features : [],
      // images/media
      image_url: product.image_url ?? null,
      gallery: Array.isArray(product.gallery) ? product.gallery : [],
      variants: Array.isArray(product.variants) ? product.variants : [],
      seo: product.seo || null,
      updated_at: new Date().toISOString(),
      // Additional fields (legacy)
      ingredients_inci: product.ingredients_inci ?? null,
    };

    // Upsert by id if provided, otherwise try to find by slug first
    let data, error;
    if (row.id) {
      // Update existing product by id
      const { data: updated, error: updateError } = await admin
        .from('products')
        .update(row)
        .eq('id', row.id)
        .select('*')
        .single();
      data = updated;
      error = updateError;
    } else {
      // Check if product with this slug exists
      const { data: existing } = await admin
        .from('products')
        .select('id')
        .eq('slug', row.slug)
        .maybeSingle();
      
      if (existing) {
        // Update existing by slug
        const { data: updated, error: updateError } = await admin
          .from('products')
          .update(row)
          .eq('id', existing.id)
          .select('*')
          .single();
        data = updated;
        error = updateError;
      } else {
        // Insert new product
        delete row.id; // Remove undefined id
        const { data: inserted, error: insertError } = await admin
          .from('products')
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
      body: JSON.stringify({ ok: true, product: data })
    };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e?.message || String(e) }) };
  }
};
