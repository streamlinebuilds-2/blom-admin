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
    const stock = Number(body.stock ?? body.inventory_quantity ?? 0);

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

    // Map to table schema using clean column names
    const row: any = {
      id: body.id ?? undefined,

      // Core fields
      name,
      slug,
      sku: body.sku ?? null,
      category: body.category ?? null,
      status: body.status ?? 'draft',

      // Pricing (use clean columns)
      price: price,
      compare_at_price: compareAt,

      // Stock (use 'stock' as primary, sync others for compatibility)
      stock: stock,
      stock_on_hand: stock,
      stock_qty: stock,
      stock_quantity: stock,
      stock_available: stock,

      // Descriptions (use modern names)
      short_description: body.short_description ?? null,
      overview: body.overview ?? null,

      // Images (use modern names)
      thumbnail_url: body.thumbnail_url ?? null,
      gallery_urls: Array.isArray(body.gallery_urls) ? body.gallery_urls : [],

      // Product details arrays
      features: Array.isArray(body.features) ? body.features : [],
      how_to_use: Array.isArray(body.how_to_use) ? body.how_to_use : [],
      inci_ingredients: Array.isArray(body.inci_ingredients) ? body.inci_ingredients : [],
      key_ingredients: Array.isArray(body.key_ingredients) ? body.key_ingredients : [],
      claims: Array.isArray(body.claims) ? body.claims : [],
      variants: Array.isArray(body.variants) ? body.variants : [],

      // Details
      size: body.size ?? null,
      shelf_life: body.shelf_life ?? null,
      weight: body.weight ?? null,

      // Meta
      meta_title: body.meta_title ?? null,
      meta_description: body.meta_description ?? null,
      is_active: body.is_active ?? true,
      is_featured: body.is_featured ?? false,

      // Timestamps
      updated_at: new Date().toISOString(),
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
