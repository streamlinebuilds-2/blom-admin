// Use singleton from lib/supabase to avoid multiple clients
import { supabase } from '@/lib/supabase';

// Helper to throw on Supabase errors, but return empty array for list functions on error
function ensure(data, error) {
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

// Helper for list functions that should never crash the app
function ensureArray(data, error) {
  if (error) {
    console.error('Supabase query error:', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

// Helper to ensure how_to_use is always an array
function ensureHowToUseArray(howToUse) {
  if (!howToUse) return [];
  if (Array.isArray(howToUse)) return howToUse;
  if (typeof howToUse === 'string') {
    // Try to parse as JSON first (might be JSON string)
    try {
      const parsed = JSON.parse(howToUse);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Not JSON, so split by newlines and filter empty strings
      return howToUse.split('\n').map(item => item.trim()).filter(Boolean);
    }
  }
  // Fallback for other types
  return [];
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
  if (!supabase || typeof supabase.from !== 'function') {
    throw new Error('Supabase client not configured');
  }
  return {
    // ===== PRODUCTS =====
    async listProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('updated_at', { ascending: false });
        
        const products = ensureArray(data, error);
        
        // Transform how_to_use to always be an array for all products
        return products.map(product => ({
          ...product,
          how_to_use: ensureHowToUseArray(product.how_to_use)
        }));
      } catch (err) {
        console.error('Error listing products:', err);
        return [];
      }
    },

    async getProduct(id) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      const product = ensure(data, error);
      
      // Transform how_to_use to always be an array for frontend compatibility
      if (product) {
        return {
          ...product,
          how_to_use: ensureHowToUseArray(product.how_to_use)
        };
      }
      
      return product;
    },

    async upsertProduct(p) {
      // Route product saves through Netlify function (service role)
      const product = { ...p };
      if (!product.slug && product.name) {
        product.slug = generateSlug(product.name);
      }

      // Map fields to match save-product function expectations
      const payload = {
        id: product.id,
        name: String(product.name || '').trim(),
        slug: String(product.slug || '').trim(),
        status: product.status || (product.active === false ? 'draft' : 'active'),
        price: Number(product.price || product.price_cents ? (product.price_cents / 100) : 0),
        compare_at_price: product.compare_at_price != null ? Number(product.compare_at_price) : null,
        stock: Number(product.stock ?? product.stock_qty ?? product.stock_on_hand ?? 0) || 0,
        short_description: product.short_description ?? product.short_desc ?? null,
        long_description: product.long_description ?? product.description ?? null,
        image_url: product.image_url ?? product.thumbnail ?? null,
        gallery: Array.isArray(product.images) ? product.images : (product.gallery || []),
      };

      const res = await fetch('/.netlify/functions/save-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`save-product failed: ${res.status} ${text}`);
      }

      const saved = await res.json();
      return saved.product || saved;
    },

    // Partial update - only updates specified fields, preserves all others (like images)
    async partialUpdateProduct(p) {
      if (!p.id) {
        throw new Error('partialUpdateProduct requires product id');
      }

      // Build payload with only the fields that should be updated
      const payload = {
        id: p.id,
        partial_update: true,  // This flag tells the backend to only update provided fields
      };

      // Only include fields that are explicitly provided
      if (p.name !== undefined) payload.name = String(p.name).trim();
      if (p.slug !== undefined) payload.slug = String(p.slug).trim();
      if (p.status !== undefined) payload.status = p.status;
      if (p.sku !== undefined) payload.sku = p.sku;
      if (p.category !== undefined) payload.category = p.category;

      // Price - convert from cents if provided as price_cents
      if (p.price !== undefined) {
        payload.price = Number(p.price);
      } else if (p.price_cents !== undefined) {
        payload.price = Number(p.price_cents) / 100;
      }

      if (p.compare_at_price !== undefined) {
        payload.compare_at_price = p.compare_at_price != null ? Number(p.compare_at_price) : null;
      }

      // Stock
      if (p.stock !== undefined || p.stock_qty !== undefined || p.stock_on_hand !== undefined) {
        payload.stock = Number(p.stock ?? p.stock_qty ?? p.stock_on_hand ?? 0);
      }

      // Descriptions
      if (p.short_description !== undefined) payload.short_description = p.short_description;
      if (p.overview !== undefined) payload.overview = p.overview;

      // Images
      if (p.thumbnail_url !== undefined) payload.thumbnail_url = p.thumbnail_url;
      if (p.gallery_urls !== undefined) payload.gallery_urls = p.gallery_urls;
      if (p.image_url !== undefined) payload.thumbnail_url = p.image_url;
      if (p.images !== undefined) payload.gallery_urls = p.images;

      // Product details
      if (p.features !== undefined) payload.features = p.features;
      if (p.how_to_use !== undefined) payload.how_to_use = p.how_to_use;
      if (p.inci_ingredients !== undefined) payload.inci_ingredients = p.inci_ingredients;
      if (p.key_ingredients !== undefined) payload.key_ingredients = p.key_ingredients;
      if (p.claims !== undefined) payload.claims = p.claims;
      if (p.variants !== undefined) payload.variants = p.variants;

      // Details
      if (p.size !== undefined) payload.size = p.size;
      if (p.shelf_life !== undefined) payload.shelf_life = p.shelf_life;
      if (p.weight !== undefined) payload.weight = p.weight;

      // Cost price
      if (p.cost_price_cents !== undefined) payload.cost_price_cents = p.cost_price_cents;

      // Meta
      if (p.meta_title !== undefined) payload.meta_title = p.meta_title;
      if (p.meta_description !== undefined) payload.meta_description = p.meta_description;
      if (p.is_active !== undefined) payload.is_active = p.is_active;
      if (p.is_featured !== undefined) payload.is_featured = p.is_featured;

      const res = await fetch('/.netlify/functions/save-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`save-product partial update failed: ${res.status} ${text}`);
      }

      const saved = await res.json();
      return saved.product || saved;
    },

    // ===== COURSES =====
    async listCourses() {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .order('created_at', { ascending: false });
        return ensureArray(data, error);
      } catch (err) {
        console.error('Error listing courses:', err);
        return [];
      }
    },

    async getCourse(id) {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single();
        return ensure(data, error);
      } catch (err) {
        console.error('Error loading course:', err);
        return null;
      }
    },

    async upsertCourse(c) {
      const payload = {
        id: c.id,
        title: String(c.title || '').trim(),
        slug: String(c.slug || '').trim(),
        description: c.description ?? null,
        price: c.price === '' || c.price == null ? null : Number(c.price),
        compare_at_price: c.compare_at_price === '' || c.compare_at_price == null ? null : Number(c.compare_at_price),
        image_url: c.image_url ?? null,
        duration: c.duration ?? null,
        level: c.level ?? null,
        template_key: c.template_key ?? null,
        course_type: c.course_type || 'in-person',
        is_active: c.is_active !== false,
      };

      const res = await fetch('/.netlify/functions/save-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`save-course failed: ${res.status} ${text}`);
      }

      const saved = await res.json();
      return saved.course || saved;
    },

    // ===== INVENTORY =====
    async listStockMovements(limit = 50) {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*, products(name)')
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
      try {
        console.log('🔍 Fetching specials from database...');
        const { data, error } = await supabase
          .from('specials')
          .select('*')
          .order('starts_at', { ascending: false });
        
        if (error) {
          console.error('❌ Supabase error fetching specials:', error);
          console.log('💡 This might mean the specials table doesn\'t exist or has wrong schema');
          return [];
        }
        
        console.log('✅ Fetched specials:', data?.length || 0, 'items');
        return ensureArray(data, error);
      } catch (err) {
        console.error('💥 Exception in listSpecials:', err);
        return [];
      }
    },

    async upsertSpecial(s) {
      // Route special saves through Netlify function (service role)
      const special = { ...s };
      
      // Ensure required fields are present
      if (!special.title || !special.starts_at || !special.ends_at) {
        throw new Error('Missing required fields for special');
      }

      // Prepare payload for save-special function
      const payload = {
        id: special.id,
        title: String(special.title || '').trim(),
        starts_at: special.starts_at,
        ends_at: special.ends_at,
        scope: special.scope || 'product',
        discount_type: special.discount_type || 'percent',
        discount_value: Number(special.discount_value || 0),
        status: special.status || 'active',
        target_ids: Array.isArray(special.target_ids) ? special.target_ids : [],
      };

      const res = await fetch('/.netlify/functions/save-special', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`save-special failed: ${res.status} ${text}`);
      }

      const saved = await res.json();
      if (!saved.ok) {
        throw new Error(saved.error || 'Save special failed');
      }
      return saved.special || saved;
    },

    // ===== BUNDLES =====
    async listBundles() {
      try {
        const { data: bundles, error: bundleError } = await supabase
          .from('bundles')
          .select('*');
        
        const bundlesArray = ensureArray(bundles, bundleError);
        if (bundlesArray.length === 0) return [];

        // Fetch items for each bundle
        const result = await Promise.all(
          bundlesArray.map(async (b) => {
            try {
              const { data: items } = await supabase
                .from('bundle_items')
                .select('product_id, qty')
                .eq('bundle_id', b.id);
              return { ...b, items: items || [] };
            } catch (err) {
              console.error(`Error fetching items for bundle ${b.id}:`, err);
              return { ...b, items: [] };
            }
          })
        );

        return result;
      } catch (err) {
        console.error('Error listing bundles:', err);
        return [];
      }
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

    async deleteBundle(id) {
      try {
        // Delete bundle items first (if cascade is not set up)
        const { error: itemsError } = await supabase
          .from('bundle_items')
          .delete()
          .eq('bundle_id', id);
        
        if (itemsError) throw itemsError;

        // Then delete the bundle
        const { error } = await supabase
          .from('bundles')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return true;
      } catch (err) {
        console.error('Error deleting bundle:', err);
        throw err;
      }
    },

    // ===== ORDERS =====
    async listOrders() {
      try {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('*')
          .order('placed_at', { ascending: false });
        
        const ordersArray = ensureArray(orders, error);
        if (ordersArray.length === 0) return [];

        // Fetch items for each order
        const result = await Promise.all(
          ordersArray.map(async (order) => {
            try {
              const { data: items } = await supabase
                .from('order_items')
                .select('*')
                .eq('order_id', order.id);
              return { ...order, items: items || [] };
            } catch (err) {
              console.error(`Error fetching items for order ${order.id}:`, err);
              return { ...order, items: [] };
            }
          })
        );
        return result;
      } catch (err) {
        console.error('Error listing orders:', err);
        return [];
      }
    },

    async getOrder(id) {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      ensure(order, error);

      // Fetch order items
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      return { ...order, items: items || [] };
    },

    async markOrderPaid(id) {
      const order = await this.getOrder(id);

      // Update order status and payment status
      const { data: updatedOrder, error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
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

      // Fetch complete updated order
      const updated = await this.getOrder(id);
      return { order: updated, payment };
    },

    async updateFulfillment(id, patch) {
      const updates = { ...patch };
      if (patch.fulfillment_status === 'fulfilled') {
        updates.fulfilled_at = new Date().toISOString();
      }

      const { data: order, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      ensure(order, error);

      // Fetch complete order
      return await this.getOrder(id);
    },

    async updateDeliveryMethod(id, method, shipping_address) {
      const updates = { delivery_method: method };
      if (shipping_address) {
        updates.shipping_address = shipping_address;
      }

      const { data: order, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      ensure(order, error);

      // Fetch complete order
      return await this.getOrder(id);
    },

    async listPayments() {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });
        return ensureArray(data, error);
      } catch (err) {
        console.error('Error listing payments:', err);
        return [];
      }
    },

    // ===== MESSAGES =====
    async listMessages() {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: false });
        return ensureArray(data, error);
      } catch (err) {
        console.error('Error listing messages:', err);
        return [];
      }
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
      try {
        let query = supabase.from('reviews').select('*');
        if (status) query = query.eq('status', status);
        const { data, error } = await query.order('created_at', { ascending: false });
        return ensureArray(data, error);
      } catch (err) {
        console.error('Error listing reviews:', err);
        return [];
      }
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
    // ===== FINANCE =====
    async createOperatingCost(cost) {
      const { data, error } = await supabase
        .from('operating_costs')
        .insert([{ ...cost, created_at: new Date().toISOString() }])
        .select()
        .single();
      return ensure(data, error);
    },
  };
}

