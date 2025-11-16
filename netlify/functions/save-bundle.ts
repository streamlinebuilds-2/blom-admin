import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Empty body' })
      };
    }

    let body: any;
    try {
      body = typeof event.body === 'string'
        ? JSON.parse(event.body)
        : event.body;
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Invalid JSON' })
      };
    }

    const payload = body.payload || body;

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing env vars' })
      };
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false }
    });

    // Auto-generate fields
    const generateSKU = () => {
      const prefix = 'BUNDLE';
      const timestamp = Date.now().toString().slice(-6);
      return `${prefix}-${timestamp}`;
    };

    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    };

    // Validate required fields
    const name = String(payload.name || '').trim();
    if (!name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Bundle name is required' })
      };
    }

    const price = parseFloat(payload.price) || 0;
    if (price <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ ok: false, error: 'Price must be greater than 0' })
      };
    }

    const compareAtPrice = payload.compare_at_price
      ? parseFloat(payload.compare_at_price)
      : null;

    const stock = parseInt(payload.stock || payload.inventory_quantity || '0') || 0;

    // Validate status
    const validStatuses = ['draft', 'active', 'published', 'archived'];
    const status = validStatuses.includes(payload.status) ? payload.status : 'active';

    const bundleData: any = {
      id: payload.id || undefined,
      name: name,
      slug: slugify(name),
      sku: payload.sku || generateSKU(),
      category: 'Bundle Deals', // Force bundle category
      product_type: 'bundle',
      status: status,

      // Pricing - save both formats for compatibility
      price: price,
      price_cents: Math.round(price * 100),
      compare_at_price: compareAtPrice,
      compare_at_price_cents: compareAtPrice
        ? Math.round(compareAtPrice * 100)
        : null,

      // Stock - sync all stock columns for compatibility
      stock: stock,
      stock_on_hand: stock,
      stock_qty: stock,
      stock_quantity: stock,
      stock_reserved: 0,

      // Descriptions
      short_description: payload.short_description || null,
      overview: payload.overview || null,

      // Images
      thumbnail_url: payload.thumbnail_url || null,
      hover_url: payload.hover_url || null,
      gallery_urls: Array.isArray(payload.gallery_urls) ? payload.gallery_urls : [],

      // Arrays
      features: Array.isArray(payload.features) ? payload.features : [],
      how_to_use: Array.isArray(payload.how_to_use) ? payload.how_to_use : [],
      inci_ingredients: Array.isArray(payload.inci_ingredients) ? payload.inci_ingredients : [],
      key_ingredients: Array.isArray(payload.key_ingredients) ? payload.key_ingredients : [],
      claims: Array.isArray(payload.claims) ? payload.claims : [],
      variants: Array.isArray(payload.variants) ? payload.variants : [],

      // Bundle-specific
      bundle_products: Array.isArray(payload.bundle_products) ? payload.bundle_products : [],

      // Details
      size: payload.size || null,
      shelf_life: payload.shelf_life || null,
      weight: payload.weight || null,

      // Meta
      meta_title: name,
      meta_description: payload.short_description
        ? `${payload.short_description.substring(0, 150)}...`
        : `Buy ${name} bundle at BLOM Cosmetics`,

      is_active: status === 'active' || status === 'published',
      is_featured: payload.is_featured || false,

      updated_at: new Date().toISOString(),
    };

    let data, error;

    if (payload.id) {
      // Update existing bundle
      const { data: updated, error: updateError } = await supabase
        .from('products') // Bundles stored in products table
        .update(bundleData)
        .eq('id', payload.id)
        .select()
        .single();

      data = updated;
      error = updateError;
    } else {
      // Check if bundle with this slug exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', bundleData.slug)
        .maybeSingle();

      if (existing) {
        // Update existing by slug
        const { data: updated, error: updateError } = await supabase
          .from('products')
          .update(bundleData)
          .eq('id', existing.id)
          .select()
          .single();
        data = updated;
        error = updateError;
      } else {
        // Create new bundle
        delete bundleData.id;
        const { data: created, error: createError } = await supabase
          .from('products')
          .insert(bundleData)
          .select()
          .single();

        data = created;
        error = createError;
      }
    }

    if (error) {
      console.error('DB error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, bundle: data })
    };

  } catch (e: any) {
    console.error('Save bundle error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message || 'Server error' })
    };
  }
};
