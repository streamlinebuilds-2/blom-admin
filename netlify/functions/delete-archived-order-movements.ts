import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const handler: Handler = async (e) => {
  try {
    // Delete stock movements for archived orders
    const { data, error } = await s.rpc('exec', {
      query: `
        -- Delete stock movements for archived orders
        DELETE FROM stock_movements 
        WHERE order_id IN (
            SELECT id FROM orders WHERE archived = true
        );
        
        -- Show the count of deleted movements
        SELECT 'Deleted stock movements for archived orders' as action, 
               COUNT(*) as deleted_count
        FROM stock_movements 
        WHERE order_id NOT IN (
            SELECT id FROM orders WHERE archived = false
        );
      `
    });

    if (error) {
      console.error('Error deleting archived order movements:', error);
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: false, error: error.message })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        ok: true, 
        message: 'Stock movements for archived orders have been permanently deleted',
        data: data
      })
    };
  } catch (err: any) {
    console.error('Delete archived order movements error:', err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};