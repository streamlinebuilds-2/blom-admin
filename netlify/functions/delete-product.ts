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
    const { id, slug } = body;
    
    if (!id && !slug) {
      return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Provide id or slug' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Check if product has any order items (foreign key constraint)
    const { data: orderItems, error: checkError } = await supabase
      .from('order_items')
      .select('id')
      .match(id ? { product_id: id } : { product_id: id })
      .limit(1);

    if (checkError) {
      console.error('Error checking order items:', checkError);
    }

    // If product has order items, soft delete (archive) instead of hard delete
    if (orderItems && orderItems.length > 0) {
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
          message: 'Product has existing orders and was archived instead of deleted',
          product: data
        }),
      };
    }

    // No order items, safe to hard delete
    const { error } = await supabase
      .from('products')
      .delete()
      .match(id ? { id } : { slug });
    
    if (error) {
      // If we still get a foreign key error, fall back to archiving
      if (error.message.includes('foreign key constraint') || error.code === '23503') {
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
      
      return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: `DB error: ${error.message}` }) };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, deleted: true }),
    };
  } catch (err: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err?.message || 'Delete failed' }) };
  }
};

