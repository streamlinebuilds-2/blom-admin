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

    const targetNames = [
      'Red Collection',
      'High Tea Brigerton Combo',
      'Blossom Sugar Rush Collection',
      'Snowberry Christmas Collection',
      'Petal Collection Bundle',
      'Pastel Acrylic Collection',
      'Blooming Love Acrylic Collection'
    ];

    console.log(`Fixing categories for ${targetNames.length} bundles...`);

    const { data, error } = await supabase
      .from('bundles')
      .update({ 
        product_type: 'bundle',
        category: 'Bundle Deals'
      })
      .in('name', targetNames)
      .select('id, name, product_type, category');

    if (error) {
      console.error('Error updating bundles:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ ok: false, error: error.message })
      };
    }

    console.log('Update successful:', data);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        ok: true, 
        message: `Updated ${data?.length || 0} bundles`,
        updated: data 
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
