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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  try {
    const { productId, quantityChange, reason, costPrice } = JSON.parse(event.body || '{}');

    if (!productId) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing productId' }) };
    }

    const supabase = getSupabaseAdmin();
    const promises = [];

    // 1. Update Stock (if quantity changed)
    if (quantityChange && quantityChange !== 0) {
      // Invert logic: Input 5 means ADD 5. RPC takes "quantity_to_reduce".
      // So to ADD, we reduce by -5.
      const reduceBy = -quantityChange;

      const stockPromise = supabase.rpc('adjust_stock', {
        product_uuid: productId,
        quantity_to_reduce: reduceBy
      }).then(async ({ error }) => {
        if (error) throw error;

        // Log movement
        const { error: logError } = await supabase.from('stock_movements').insert({
          product_id: productId,
          quantity_change: quantityChange,
          reason: reason || 'manual_adjustment',
          product_name: 'Manual Update' // Will be filled by trigger or ignored, mostly for ref
        });
        if (logError) console.error('Log Error:', logError);
      });

      promises.push(stockPromise);
    }

    // 2. Update Cost Price (if provided)
    if (costPrice !== undefined && costPrice !== null) {
      const costCents = Math.round(parseFloat(costPrice) * 100);
      const costPromise = supabase
        .from('products')
        .update({
          cost_price_cents: costCents,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      promises.push(costPromise);
    }

    await Promise.all(promises);

    // CRITICAL: Also invalidate products query so Products page updates
    // Even though we're updating via RPC, the products table doesn't auto-refresh
    const { error: refreshError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .limit(1);

    // This forces Supabase to acknowledge the change

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };

  } catch (e: any) {
    console.error('Adjust Stock Error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};



