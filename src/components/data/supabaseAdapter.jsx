import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to throw on Supabase errors
function ensure(data, error) {
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

// Generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function createSupabaseAdapter() {
  return {
    // ===== PRODUCTS =====
    async listProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false });
      return ensure(data || [], error);
    },

    async getProduct(id) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      return ensure(data, error);
    },

    async upsertProduct(p) {
      const product = { ...p };
      if (!product.slug && product.name) {
        product.slug = generateSlug(product.name);
      }

      // Convert arrays to JSON strings if needed
      if (Array.isArray(product.features))
        product.features = JSON.stringify(product.features);
      if (Array.isArray(product.images))
        product.images = JSON.stringify(product.images);

      let result;
      if (product.id) {
        const { data, error } = await supabase
          .from('products')
          .update(product)
          .eq('id', product.id)
          .select()
          .single();
        result = ensure(data, error);
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([product])
          .select()
          .single();
        result = ensure(data, error);
      }

      // Parse JSON fields back
      if (typeof result.features === 'string')
        result.features = JSON.parse(result.features);
      if (typeof result.images === 'string')
        result.images = JSON.parse(result.images);

      return result;
    },

    // ===== INVENTORY =====
    async listStockMovements(limit = 50) {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return ensure(data || [], error);
    },

    async adjustStock(product_id, delta, reason) {
      // Read current stock
      const product = await this.getProduct(product_id);
      const newQty = (product.stock_qty || 0) + delta;

      // Update stock
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({ stock_qty: newQty })
        .eq('id', product_id)
        .select()
        .single();
      ensure(updatedProduct, updateError);

      // Insert movement
      const { data: movement, error: moveError } = await supabase
        .from('stock_movements')
        .insert([{ product_id, delta, reason, created_at: new Date().toISOString() }])
        .select()
        .single();
      ensure(movement, moveError);

      return { product: updatedProduct, movement };
    },

    // ===== SPECIALS =====
    async listSpecials() {
      const { data, error } = await supabase
        .from('specials')
        .select('*')
        .order('starts_at', { ascending: false });
      return ensure(data || [], error);
    },

    async upsertSpecial(s) {
      let result;
      if (s.id) {
        const { data, error } = await supabase
          .from('specials')
          .update(s)
          .eq('id', s.id)
          .select()
          .single();
        result = ensure(data, error);
      } else {
        const { data, error } = await supabase
          .from('specials')
          .insert([s])
          .select()
          .single();
        result = ensure(data, error);
      }
      return result;
    },

    // ===== BUNDLES =====
    async listBundles() {
      const { data: bundles, error: bundleError } = await supabase
        .from('bundles')
        .select('*');
      ensure(bundles, bundleError);

      // Fetch items for each bundle
      const result = await Promise.all(
        bundles.map(async (b) => {
          const { data: items } = await supabase
            .from('bundle_items')
            .select('product_id, qty')
            .eq('bundle_id', b.id);
          return { ...b, items: items || [] };
        })
      );

      return result;
    },

    async upsertBundle(b) {
      const bundle = { ...b };
      const items = bundle.items || [];
      delete bundle.items;

      if (!bundle.slug && bundle.name) {
        bundle.slug = generateSlug(bundle.name);
      }

      if (Array.isArray(bundle.images))
        bundle.images = JSON.stringify(bundle.images);

      let bundleData;
      if (bundle.id) {
        const { data, error } = await supabase
          .from('bundles')
          .update(bundle)
          .eq('id', bundle.id)
          .select()
          .single();
        bundleData = ensure(data, error);
      } else {
        const { data, error } = await supabase
          .from('bundles')
          .insert([bundle])
          .select()
          .single();
        bundleData = ensure(data, error);
      }

      // Delete old items
      if (bundleData.id) {
        await supabase.from('bundle_items').delete().eq('bundle_id', bundleData.id);

        // Insert new items
        if (items.length > 0) {
          const itemsToInsert = items.map((item) => ({
            bundle_id: bundleData.id,
            product_id: item.product_id,
            qty: item.qty,
          }));
          await supabase.from('bundle_items').insert(itemsToInsert);
        }
      }

      if (typeof bundleData.images === 'string')
        bundleData.images = JSON.parse(bundleData.images);

      return { ...bundleData, items };
    },

    // ===== ORDERS =====
    async listOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      return ensure(data || [], error);
    },

    async getOrder(id) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      return ensure(data, error);
    },

    async markOrderPaid(id) {
      const order = await this.getOrder(id);

      // Update order status
      const { data: updatedOrder, error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', id)
        .select()
        .single();
      ensure(updatedOrder, orderError);

      // Insert payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            order_id: id,
            provider: 'manual',
            amount_cents: order.total_cents,
            status: 'succeeded',
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
      ensure(payment, paymentError);

      return { order: updatedOrder, payment };
    },

    async listPayments() {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      return ensure(data || [], error);
    },

    // ===== MESSAGES =====
    async listMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
      return ensure(data || [], error);
    },

    async getMessage(id) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();
      return ensure(data, error);
    },

    async createMessage(m) {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ ...m, created_at: new Date().toISOString() }])
        .select()
        .single();
      return ensure(data, error);
    },

    async updateMessage(id, patch) {
      const { data, error } = await supabase
        .from('messages')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      return ensure(data, error);
    },

    // ===== REVIEWS =====
    async listReviews(status) {
      let query = supabase.from('reviews').select('*');
      if (status) query = query.eq('status', status);
      const { data, error } = await query.order('created_at', { ascending: false });
      return ensure(data || [], error);
    },

    async createReview(r) {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{ ...r, created_at: new Date().toISOString() }])
        .select()
        .single();
      return ensure(data, error);
    },

    async updateReview(id, patch) {
      const { data, error } = await supabase
        .from('reviews')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      return ensure(data, error);
    },
  };
}
