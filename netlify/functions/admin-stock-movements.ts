// netlify/functions/admin-stock-movements.ts
import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    const limit = Number(e.queryStringParameters?.limit || 100);
    const filter = e.queryStringParameters?.filter || 'all'; // 'all', 'manual', 'order'
    
    let query = s
      .from("stock_movements")
      .select(`
        id,
        product_id,
        order_id,
        delta,
        reason,
        product_name,
        variant_index,
        movement_type,
        notes,
        created_at,
        product:products(id, name, slug)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (filter === 'manual') {
      query = query.eq('movement_type', 'manual');
    } else if (filter === 'order') {
      query = query.eq('movement_type', 'order');
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Stock movements query error:', error);
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
    }
    
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true, 
        data: data || [],
        filter,
        count: data?.length || 0
      }) 
    };
  } catch (err: any) {
    console.error('Stock movements handler error:', err);
    return { statusCode: 500, body: err.message || "admin-stock-movements failed" };
  }
};



