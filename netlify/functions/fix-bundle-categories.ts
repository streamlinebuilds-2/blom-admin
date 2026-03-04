import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*'
};

export const handler: Handler = async (event) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: 'Missing Supabase environment variables' })
      };
    }
    
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    console.log('Starting Category Merge: Bundles -> Bundle Deals');

    const results = {
      bundlesUpdated: 0,
      productsUpdated: 0,
      specificFixes: 0
    };

    // 1. Merge 'Bundles' category into 'Bundle Deals' for the bundles table
    // Also ensure product_type is 'bundle'
    const { data: bundlesData, error: bundlesError } = await supabase
      .from('bundles')
      .update({ 
        category: 'Bundle Deals',
        product_type: 'bundle' 
      })
      .or('category.ilike.Bundles,category.ilike.bundle') // Matches 'Bundles', 'bundles', 'bundle'
      .select('id');
    
    if (bundlesError) throw bundlesError;
    results.bundlesUpdated = bundlesData?.length || 0;

    // 2. Merge 'Bundles' category into 'Bundle Deals' for the products table
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .update({ 
        category: 'Bundle Deals',
        product_type: 'bundle' // Assuming products table also has product_type
      })
      .or('category.ilike.Bundles,category.ilike.bundle')
      .select('id');

    // Note: products table might not have product_type column or it might be different.
    // If it fails, we try updating just category.
    if (productsError) {
        console.warn('Could not update product_type on products table, trying category only', productsError.message);
        const { data: productsDataRetry, error: productsErrorRetry } = await supabase
        .from('products')
        .update({ category: 'Bundle Deals' })
        .or('category.ilike.Bundles,category.ilike.bundle')
        .select('id');
        
        if (productsErrorRetry) throw productsErrorRetry;
        results.productsUpdated = productsDataRetry?.length || 0;
    } else {
        results.productsUpdated = productsData?.length || 0;
    }

    // 3. Force specific products to be 'Bundle Deals' as requested
    const targetNames = [
      'Red Collection',
      'High Tea Brigerton Combo',
      'Blossom Sugar Rush Collection',
      'Snowberry Christmas Collection',
      'Petal Collection Bundle',
      'Pastel Acrylic Collection',
      'Blooming Love Acrylic Collection'
    ];

    const { data: specificData, error: specificError } = await supabase
      .from('bundles')
      .update({ 
        product_type: 'bundle',
        category: 'Bundle Deals'
      })
      .in('name', targetNames)
      .select('id, name');

    if (specificError) throw specificError;
    results.specificFixes = specificData?.length || 0;

    console.log('Merge successful:', results);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        ok: true, 
        message: `Merged categories successfully.`,
        details: results
      })
    };

  } catch (e: any) {
    console.error('Script Error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: e.message })
    };
  }
};
