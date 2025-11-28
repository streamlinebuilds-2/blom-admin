import { supabase } from '@/lib/supabase';

export const createSupabaseAdapter = () => {
  if (!supabase) {
    console.warn('Supabase client not available');
    return null;
  }

  return {
    // Products
    async getProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    },

    async getProduct(id) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching product:', error);
        return null;
      }
    },

    // Orders
    async getOrders() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },

    async getOrder(id) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error fetching order:', error);
        return null;
      }
    },

    // Contacts
    async getContacts() {
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching contacts:', error);
        return [];
      }
    },

    // Reviews
    async getReviews() {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching reviews:', error);
        return [];
      }
    },

    // Messages
    async getMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },

    // Bundles
    async getBundles() {
      try {
        const { data, error } = await supabase
          .from('bundles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching bundles:', error);
        return [];
      }
    },

    // Stock movements
    async getStockMovements() {
      try {
        const { data, error } = await supabase
          .from('stock_movements')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error fetching stock movements:', error);
        return [];
      }
    },

    // Generic query method
    async query(table, options = {}) {
      try {
        let query = supabase.from(table).select('*');
        
        if (options.select) {
          query = supabase.from(table).select(options.select);
        }
        if (options.eq) {
          Object.entries(options.eq).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
        }
        if (options.order) {
          query = query.order(options.order.column, { ascending: options.order.ascending || false });
        }
        if (options.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error(`Error querying ${table}:`, error);
        return [];
      }
    },

    // Insert method
    async insert(table, data) {
      try {
        const { data: result, error } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single();
        if (error) throw error;
        return result;
      } catch (error) {
        console.error(`Error inserting into ${table}:`, error);
        return null;
      }
    },

    // Update method
    async update(table, id, data) {
      try {
        const { data: result, error } = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return result;
      } catch (error) {
        console.error(`Error updating ${table}:`, error);
        return null;
      }
    },

    // Delete method
    async delete(table, id) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);
        if (error) throw error;
        return true;
      } catch (error) {
        console.error(`Error deleting from ${table}:`, error);
        return false;
      }
    }
  };
};