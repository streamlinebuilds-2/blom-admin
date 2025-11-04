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

    // Validate requireds
    const name = String(product.name || '').trim();
    const slug = String(product.slug || '').trim();
    const sku = String(product.sku || '').trim();
    const category = String(product.category || '').trim();
    const price = Number(product.price);
    const inventory_quantity = Number(product.inventory_quantity ?? 0);
    const thumbnail_url = String(product.thumbnail_url || '').trim();
    const short_description = String(product.short_description || '').trim();

    if (!name || !slug || !sku || !category) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing required fields (name, slug, sku, category)' }) };
    }
    if (!Number.isFinite(price) || price <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid price (must be > 0)' }) };
    }
    if (!thumbnail_url) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Thumbnail URL is required' }) };
    }
    if (!short_description) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Short description is required' }) };
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Server not configured (SUPABASE envs missing)' }) };
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const compareAt = product.compare_at_price == null ? null : Number(product.compare_at_price);
    
    // Build images array: [thumbnail, hover?, ...gallery]
    const images = [
      thumbnail_url,
      ...(product.hover_image_url ? [product.hover_image_url] : []),
      ...(Array.isArray(product.gallery_urls) ? product.gallery_urls : [])
    ].filter(Boolean);

    // Map to table schema (write both numeric and *_cents fields, and sync stock variants)
    const row: any = {
      id: product.id ?? undefined,
      name,
      slug,
      sku,
      category,
      status: product.status || 'draft',
      // Pricing
      price: price,
      price_cents: Math.round(price * 100),
      compare_at_price: compareAt,
      compare_at_price_cents: compareAt == null ? null : Math.round(compareAt * 100),
      // Stock (map inventory_quantity to all stock fields)
      inventory_quantity: inventory_quantity,
      stock: inventory_quantity,
      stock_on_hand: inventory_quantity,
      stock_qty: inventory_quantity,
      track_inventory: product.track_inventory !== false,
      // Images
      thumbnail_url: thumbnail_url,
      hover_image_url: product.hover_image_url || null,
      gallery_urls: Array.isArray(product.gallery_urls) ? product.gallery_urls : [],
      image_url: thumbnail_url, // Legacy field
      gallery: images, // Legacy field
      // Descriptions
      short_description: short_description,
      short_desc: short_description,
      description: product.description || null,
      long_description: product.description || product.overview || null,
      overview: product.overview || product.description || null,
      // Product Details
      size: product.size || null,
      shelf_life: product.shelf_life || null,
      weight: product.weight ?? null,
      barcode: product.barcode || null,
      // Features & Usage
      features: Array.isArray(product.features) ? product.features : [],
      how_to_use: Array.isArray(product.how_to_use) ? product.how_to_use : [],
      // Ingredients
      inci_ingredients: Array.isArray(product.inci_ingredients) ? product.inci_ingredients : [],
      key_ingredients: Array.isArray(product.key_ingredients) ? product.key_ingredients : [],
      ingredients_inci: Array.isArray(product.inci_ingredients) ? product.inci_ingredients : [], // Legacy
      // Claims
      claims: Array.isArray(product.claims) ? product.claims : [],
      // Variants
      variants: Array.isArray(product.variants) ? product.variants : [],
      // SEO
      meta_title: product.meta_title || null,
      meta_description: product.meta_description || null,
      seo: {
        title: product.meta_title || null,
        description: product.meta_description || null
      },
      // Display Settings
      is_active: product.is_active !== false,
      is_featured: product.is_featured === true,
      badges: Array.isArray(product.badges) ? product.badges : [],
      // Related
      related: Array.isArray(product.related) ? product.related : [],
      updated_at: new Date().toISOString(),
    };

    // Upsert by slug (onConflict slug) - this handles both create and update
    let data, error;
    if (row.id) {
      // Update existing product by id
      delete row.id; // Remove id for update
      const { data: updated, error: updateError } = await admin
        .from('products')
        .update(row)
        .eq('id', product.id)
        .select('*')
        .single();
      data = updated;
      error = updateError;
    } else {
      // Upsert by slug (will update if exists, insert if not)
      const { data: upserted, error: upsertError } = await admin
        .from('products')
        .upsert(row, { onConflict: 'slug' })
        .select('*')
        .single();
      data = upserted;
      error = upsertError;
    }

    if (error) {
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, id: data.id, slug: data.slug, product: data })
    };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: e?.message || String(e) }) };
  }
};
