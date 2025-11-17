import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
};

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

// Helper to create a slug from a name
const slugify = (text: string) => {
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const payload = body.payload || body; // Handle wrapped payload or direct body

    console.log('Saving bundle:', payload.name);

    const supabase = getSupabaseAdmin();

    // FORCE these values to ensure it appears in the Bundle List
    const bundleData = {
      // ID handling (update if exists, create new if not)
      ...(payload.id ? { id: payload.id } : {}),

      name: payload.name,
      // Generate slug if missing, otherwise use existing
      slug: payload.slug || slugify(payload.name),
      sku: payload.sku || `BND-${Date.now()}`,

      // CRITICAL: This tags it so the Admin Bundles page can find it
      product_type: 'bundle',
      category: 'Bundle Deals',

      price: payload.price,
      compare_at_price: payload.compare_at_price,

      // Bundles don't have their own stock count (calculated from components)
      // We set it to 0 or null to avoid confusion
      stock: 0,
      track_inventory: false,

      short_description: payload.short_description,
      overview: payload.overview,
      thumbnail_url: payload.thumbnail_url,
      hover_url: payload.hover_url,

      // Store the components (array of objects { product_id, quantity })
      bundle_products: payload.bundle_products || [],

      // Status (default to active if not sent)
      status: payload.status || 'active',
      is_active: payload.status === 'active' || payload.is_active === true,

      updated_at: new Date().toISOString(),
    };

    // Upsert: Update if ID exists, Insert if not
    const { data, error } = await supabase
      .from('products')
      .upsert(bundleData)
      .select()
      .single();

    if (error) {
      console.error('Database Error:', error);
      throw error;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, bundle: data })
    };

  } catch (e: any) {
    console.error('Save Bundle Error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
