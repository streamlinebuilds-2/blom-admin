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
        product:products(id, name, slug, status),
        orders:orders(id, archived)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (filter === 'manual') {
      query = query.eq('movement_type', 'manual');
    } else if (filter === 'order') {
      query = query.eq('movement_type', 'order');
    }

    // Filter out movements for archived products (only show movements for active products)
    query = query.eq('product.status', 'active');

    // Filter out movements for archived orders (only show movements for non-archived orders)
    // We'll use a more direct approach by checking the order_id relationship

    const { data, error } = await query;
    
    if (error) {
      console.error('Stock movements query error:', error);
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
    }
    
    // Filter out movements for archived orders
    let filteredData = data || [];
    if (filteredData.length > 0) {
      // Get unique order IDs that have movements
      const orderIds = [...new Set(filteredData.map(m => m.order_id).filter(id => id))];
      
      if (orderIds.length > 0) {
        // Check which orders are archived
        const { data: archivedOrders, error: archiveError } = await s
          .from('orders')
          .select('id, archived')
          .in('id', orderIds);
          
        if (!archiveError && archivedOrders) {
          const archivedOrderIds = new Set(archivedOrders.filter(o => o.archived).map(o => o.id));
          filteredData = filteredData.filter(movement => 
            !movement.order_id || !archivedOrderIds.has(movement.order_id)
          );
        }
      }
    }
    
    if (error) {
      console.error('Stock movements query error:', error);
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: error.message }) };
    }
    
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        ok: true, 
        data: filteredData,
        filter,
        count: filteredData.length,
        originalCount: data?.length || 0
      }) 
    };
  } catch (err: any) {
    console.error('Stock movements handler error:', err);
    return { statusCode: 500, body: err.message || "admin-stock-movements failed" };
  }
};



