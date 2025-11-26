import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: 'Missing Supabase service credentials' }) };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { id, slug, forceDelete = false } = body;
    
    if (!id && !slug) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Provide id or slug' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Check if product has any order items
    const { data: orderItems, error: checkError } = await supabase
      .from('order_items')
      .select('id')
      .match(id ? { product_id: id } : { product_id: id })
      .limit(1);

    if (checkError) {
      console.error('Error checking order items:', checkError);
    }

    // If product has order items and forceDelete is not explicitly true, archive instead
    if (orderItems && orderItems.length > 0 && !forceDelete) {
      const { data, error } = await supabase
        .from('products')
        .update({ 
          status: 'archived', 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .match(id ? { id } : { slug })
        .select('*')
        .single();
      
      if (error) {
        return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          ok: true, 
          archived: true,
          message: 'Product has existing orders and was archived. Use forceDelete=true to permanently delete.',
          product: data
        }),
      };
    }

    // Try to hard delete (will cascade delete order items if constraints allow)
    const { error } = await supabase
      .from('products')
      .delete()
      .match(id ? { id } : { slug });
    
    if (error) {
      // If we get a foreign key constraint error and forceDelete is true, 
      // provide information about dependencies
      if (error.message.includes('foreign key constraint') || error.code === '23503') {
        if (forceDelete) {
          return { 
            statusCode: 409, 
            headers, 
            body: JSON.stringify({ 
              ok: false, 
              error: 'Cannot delete product due to foreign key constraints. Product has existing orders.',
              dependencies: 'order_items',
              message: 'This product cannot be deleted because it has associated order records. Please contact support to manually resolve dependencies.'
            }) 
          };
        } else {
          // Fall back to archiving
          const { data, error: archiveError } = await supabase
            .from('products')
            .update({ 
              status: 'archived', 
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .match(id ? { id } : { slug })
            .select('*')
            .single();
          
          if (archiveError) {
            return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${archiveError.message}` }) };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              ok: true, 
              archived: true,
              message: 'Product has dependencies and was archived instead of deleted',
              product: data
            }),
          };
        }
      }
      
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        ok: true, 
        deleted: true,
        message: forceDelete ? 'Product permanently deleted' : 'Product deleted'
      }),
    };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err?.message || 'Delete failed' }) };
  }
};

