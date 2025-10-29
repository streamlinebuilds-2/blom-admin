import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to generate slug from name
function generateSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Helper to ensure unique slug
async function ensureUniqueSlug(table, slug, excludeId = null) {
  let uniqueSlug = slug;
  let counter = 1;
  
  while (true) {
    let query = supabase.from(table).select('id').eq('slug', uniqueSlug).limit(1);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data } = await query;
    
    if (!data || data.length === 0) {
      return uniqueSlug;
    }
    
    uniqueSlug = `${slug}-${counter}`;
    counter++;
  }
}

export function createSupabaseAdapter() {
  return {
    async listProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        status: p.status,
        price_cents: p.price_cents,
        compare_at_price_cents: p.compare_at_price_cents,
        stock_qty: p.stock_qty,
        short_desc: p.short_desc,
        category_id: p.category_id,
        updated_at: p.updated_at
      }));
    },

    async getProduct(id) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        status: data.status,
        price_cents: data.price_cents,
        compare_at_price_cents: data.compare_at_price_cents,
        stock_qty: data.stock_qty,
        short_desc: data.short_desc,
        category_id: data.category_id,
        updated_at: data.updated_at
      };
    },

    async upsertProduct(p) {
      const now = new Date().toISOString();
      let slug = p.slug;
      
      // Generate slug if not provided
      if (!slug && p.name) {
        slug = generateSlug(p.name);
        slug = await ensureUniqueSlug('products', slug, p.id);
      }
      
      const productData = {
        name: p.name,
        slug,
        status: p.status,
        price_cents: p.price_cents,
        compare_at_price_cents: p.compare_at_price_cents,
        stock_qty: p.stock_qty,
        short_desc: p.short_desc,
        category_id: p.category_id,
        updated_at: now
      };
      
      if (p.id) {
        // Check if stock changed for movement tracking
        const { data: existing } = await supabase
          .from('products')
          .select('stock_qty')
          .eq('id', p.id)
          .single();
        
        if (existing && p.stock_qty !== undefined && p.stock_qty !== existing.stock_qty) {
          const delta = p.stock_qty - existing.stock_qty;
          
          // Create stock movement
          await supabase
            .from('stock_movements')
            .insert({
              product_id: p.id,
              delta,
              reason: 'manual edit',
              created_at: now
            });
        }
        
        // Update existing
        const { data, error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', p.id)
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          id: data.id,
          name: data.name,
          slug: data.slug,
          status: data.status,
          price_cents: data.price_cents,
          compare_at_price_cents: data.compare_at_price_cents,
          stock_qty: data.stock_qty,
          short_desc: data.short_desc,
          category_id: data.category_id,
          updated_at: data.updated_at
        };
      }
      
      // Create new
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        slug: data.slug,
        status: data.status,
        price_cents: data.price_cents,
        compare_at_price_cents: data.compare_at_price_cents,
        stock_qty: data.stock_qty,
        short_desc: data.short_desc,
        category_id: data.category_id,
        updated_at: data.updated_at
      };
    },

    async listStockMovements(limit) {
      let query = supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(m => ({
        id: m.id,
        product_id: m.product_id,
        delta: m.delta,
        reason: m.reason,
        created_at: m.created_at
      }));
    },

    async adjustStock(product_id, delta, reason) {
      const now = new Date().toISOString();
      
      // Get current product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', product_id)
        .single();
      
      if (productError || !product) {
        throw new Error('Product not found');
      }
      
      // Create movement first
      const { data: movement, error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id,
          delta,
          reason: reason || null,
          created_at: now
        })
        .select()
        .single();
      
      if (movementError) throw movementError;
      
      // Update product stock
      const newStockQty = Math.max(0, product.stock_qty + delta);
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_qty: newStockQty,
          updated_at: now
        })
        .eq('id', product_id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      return { 
        product: {
          id: updatedProduct.id,
          name: updatedProduct.name,
          slug: updatedProduct.slug,
          status: updatedProduct.status,
          price_cents: updatedProduct.price_cents,
          compare_at_price_cents: updatedProduct.compare_at_price_cents,
          stock_qty: updatedProduct.stock_qty,
          short_desc: updatedProduct.short_desc,
          category_id: updatedProduct.category_id,
          updated_at: updatedProduct.updated_at
        },
        movement: {
          id: movement.id,
          product_id: movement.product_id,
          delta: movement.delta,
          reason: movement.reason,
          created_at: movement.created_at
        }
      };
    },

    async listSpecials() {
      const now = new Date().toISOString();
      
      // Get all specials and compute active status
      const { data, error } = await supabase
        .from('specials')
        .select('*')
        .order('starts_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(s => {
        let status = s.status;
        const startsAt = new Date(s.starts_at);
        const endsAt = s.ends_at ? new Date(s.ends_at) : null;
        const isActive = startsAt <= new Date(now) && (!endsAt || endsAt > new Date(now));
        
        if (s.status === 'active' && !isActive) {
          status = 'expired';
        }
        
        return {
          id: s.id,
          scope: s.scope,
          ref_id: s.ref_id,
          discount_type: s.discount_type,
          value: s.value,
          starts_at: s.starts_at,
          ends_at: s.ends_at,
          status
        };
      });
    },

    async upsertSpecial(s) {
      const specialData = {
        scope: s.scope,
        ref_id: s.ref_id,
        discount_type: s.discount_type,
        value: s.value,
        starts_at: s.starts_at,
        ends_at: s.ends_at,
        status: s.status
      };
      
      if (s.id) {
        // Update
        const { data, error } = await supabase
          .from('specials')
          .update(specialData)
          .eq('id', s.id)
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          id: data.id,
          scope: data.scope,
          ref_id: data.ref_id,
          discount_type: data.discount_type,
          value: data.value,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
          status: data.status
        };
      }
      
      // Create
      const { data, error } = await supabase
        .from('specials')
        .insert(specialData)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        scope: data.scope,
        ref_id: data.ref_id,
        discount_type: data.discount_type,
        value: data.value,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        status: data.status
      };
    },

    async listBundles() {
      const { data, error } = await supabase
        .from('bundles')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch bundle items for each bundle
      const bundlesWithItems = await Promise.all(data.map(async (bundle) => {
        const { data: items, error: itemsError } = await supabase
          .from('bundle_items')
          .select('*')
          .eq('bundle_id', bundle.id);
        
        if (itemsError) throw itemsError;
        
        return {
          id: bundle.id,
          name: bundle.name,
          slug: bundle.slug,
          status: bundle.status,
          items: items.map(item => ({
            product_id: item.product_id,
            qty: item.qty
          })),
          pricing_mode: bundle.pricing_mode,
          discount_value: bundle.discount_value,
          price_cents: bundle.price_cents,
          compare_at_price_cents: bundle.compare_at_price_cents,
          short_desc: bundle.short_desc,
          long_desc: bundle.long_desc,
          images: bundle.images || [],
          hover_image: bundle.hover_image,
          updated_at: bundle.updated_at
        };
      }));
      
      return bundlesWithItems;
    },

    async getBundle(id) {
      const { data: bundle, error: bundleError } = await supabase
        .from('bundles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (bundleError) {
        if (bundleError.code === 'PGRST116') return null;
        throw bundleError;
      }
      
      const { data: items, error: itemsError } = await supabase
        .from('bundle_items')
        .select('*')
        .eq('bundle_id', id);
      
      if (itemsError) throw itemsError;
      
      return {
        id: bundle.id,
        name: bundle.name,
        slug: bundle.slug,
        status: bundle.status,
        items: items.map(item => ({
          product_id: item.product_id,
          qty: item.qty
        })),
        pricing_mode: bundle.pricing_mode,
        discount_value: bundle.discount_value,
        price_cents: bundle.price_cents,
        compare_at_price_cents: bundle.compare_at_price_cents,
        short_desc: bundle.short_desc,
        long_desc: bundle.long_desc,
        images: bundle.images || [],
        hover_image: bundle.hover_image,
        updated_at: bundle.updated_at
      };
    },

    async upsertBundle(b) {
      const now = new Date().toISOString();
      let slug = b.slug;
      
      // Generate slug if not provided
      if (!slug && b.name) {
        slug = generateSlug(b.name);
        slug = await ensureUniqueSlug('bundles', slug, b.id);
      }
      
      const bundleData = {
        name: b.name,
        slug,
        status: b.status,
        pricing_mode: b.pricing_mode,
        discount_value: b.discount_value,
        price_cents: b.price_cents,
        compare_at_price_cents: b.compare_at_price_cents,
        short_desc: b.short_desc,
        long_desc: b.long_desc,
        images: b.images || [],
        hover_image: b.hover_image,
        updated_at: now
      };
      
      if (b.id) {
        // Update existing bundle
        const { data: bundle, error: bundleError } = await supabase
          .from('bundles')
          .update(bundleData)
          .eq('id', b.id)
          .select()
          .single();
        
        if (bundleError) throw bundleError;
        
        // Update items: delete old, insert new
        await supabase
          .from('bundle_items')
          .delete()
          .eq('bundle_id', b.id);
        
        if (b.items && b.items.length > 0) {
          const itemsToInsert = b.items.map(item => ({
            bundle_id: b.id,
            product_id: item.product_id,
            qty: item.qty
          }));
          
          const { error: itemsError } = await supabase
            .from('bundle_items')
            .insert(itemsToInsert);
          
          if (itemsError) throw itemsError;
        }
        
        return this.getBundle(b.id);
      }
      
      // Create new bundle
      const { data: bundle, error: bundleError } = await supabase
        .from('bundles')
        .insert(bundleData)
        .select()
        .single();
      
      if (bundleError) throw bundleError;
      
      // Insert items
      if (b.items && b.items.length > 0) {
        const itemsToInsert = b.items.map(item => ({
          bundle_id: bundle.id,
          product_id: item.product_id,
          qty: item.qty
        }));
        
        const { error: itemsError } = await supabase
          .from('bundle_items')
          .insert(itemsToInsert);
        
        if (itemsError) throw itemsError;
      }
      
      return this.getBundle(bundle.id);
    },

    async computeBundleBase(items) {
      // Fetch products to calculate base price
      const productIds = items.map(item => item.product_id);
      const { data: products, error } = await supabase
        .from('products')
        .select('id, price_cents')
        .in('id', productIds);
      
      if (error) throw error;
      
      let total = 0;
      items.forEach(item => {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          total += product.price_cents * item.qty;
        }
      });
      
      return total;
    },

    async suggestBundlePrice(base, mode, value) {
      if (mode === 'manual') return base;
      if (mode === 'percent_off') {
        return Math.max(1, Math.round(base * (1 - value / 100)));
      }
      if (mode === 'amount_off') {
        return Math.max(1, Math.round(base - value * 100));
      }
      return base;
    },

    async listOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        total_cents: o.total_cents,
        created_at: o.created_at
      }));
    },

    async getOrder(id) {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return {
        id: data.id,
        order_number: data.order_number,
        status: data.status,
        total_cents: data.total_cents,
        created_at: data.created_at
      };
    },

    async markOrderPaid(id) {
      const now = new Date().toISOString();
      
      // Update order status
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', id)
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: id,
          provider: 'manual',
          amount_cents: order.total_cents,
          status: 'succeeded',
          created_at: now,
          raw: {}
        })
        .select()
        .single();
      
      if (paymentError) throw paymentError;
      
      return {
        order: {
          id: order.id,
          order_number: order.order_number,
          status: order.status,
          total_cents: order.total_cents,
          created_at: order.created_at
        },
        payment: {
          id: payment.id,
          order_id: payment.order_id,
          provider: payment.provider,
          amount_cents: payment.amount_cents,
          status: payment.status,
          created_at: payment.created_at,
          raw: payment.raw
        }
      };
    },

    async listPayments() {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(p => ({
        id: p.id,
        order_id: p.order_id,
        provider: p.provider,
        amount_cents: p.amount_cents,
        status: p.status,
        created_at: p.created_at,
        raw: p.raw
      }));
    },

    async listMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(m => ({
        id: m.id,
        full_name: m.full_name,
        email: m.email,
        phone: m.phone,
        inquiry_type: m.inquiry_type,
        subject: m.subject,
        body: m.body,
        attachments: m.attachments || [],
        status: m.status,
        created_at: m.created_at,
        updated_at: m.updated_at,
        assignee: m.assignee
      }));
    },

    async getMessage(id) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        inquiry_type: data.inquiry_type,
        subject: data.subject,
        body: data.body,
        attachments: data.attachments || [],
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
        assignee: data.assignee
      };
    },

    async createMessage(m) {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          full_name: m.full_name,
          email: m.email,
          phone: m.phone || null,
          inquiry_type: m.inquiry_type || 'general',
          subject: m.subject,
          body: m.body,
          attachments: m.attachments || [],
          status: m.status || 'new',
          created_at: now,
          updated_at: now,
          assignee: m.assignee || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        inquiry_type: data.inquiry_type,
        subject: data.subject,
        body: data.body,
        attachments: data.attachments || [],
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
        assignee: data.assignee
      };
    },

    async updateMessage(id, patch) {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('messages')
        .update({
          ...patch,
          updated_at: now
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        inquiry_type: data.inquiry_type,
        subject: data.subject,
        body: data.body,
        attachments: data.attachments || [],
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
        assignee: data.assignee
      };
    },

    async listReviews(status) {
      let query = supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(r => ({
        id: r.id,
        product_id: r.product_id,
        product_name: r.product_name,
        author_name: r.author_name,
        rating: r.rating,
        title: r.title,
        body: r.body,
        image_url: r.image_url,
        status: r.status,
        created_at: r.created_at
      }));
    },

    async getReview(id) {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      
      return {
        id: data.id,
        product_id: data.product_id,
        product_name: data.product_name,
        author_name: data.author_name,
        rating: data.rating,
        title: data.title,
        body: data.body,
        image_url: data.image_url,
        status: data.status,
        created_at: data.created_at
      };
    },

    async createReview(r) {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          product_id: r.product_id,
          product_name: r.product_name || null,
          author_name: r.author_name,
          rating: r.rating,
          title: r.title || null,
          body: r.body,
          image_url: r.image_url || null,
          status: r.status || 'pending',
          created_at: now
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        product_id: data.product_id,
        product_name: data.product_name,
        author_name: data.author_name,
        rating: data.rating,
        title: data.title,
        body: data.body,
        image_url: data.image_url,
        status: data.status,
        created_at: data.created_at
      };
    },

    async updateReview(id, patch) {
      const { data, error } = await supabase
        .from('reviews')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        product_id: data.product_id,
        product_name: data.product_name,
        author_name: data.author_name,
        rating: data.rating,
        title: data.title,
        body: data.body,
        image_url: data.image_url,
        status: data.status,
        created_at: data.created_at
      };
    },

    async estimateShipping(params) {
      // Mock implementation - can be replaced with actual shipping API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return [
        {
          service: 'Door-to-Door',
          eta: '1-3 days',
          cost_cents: 5900
        },
        {
          service: 'Locker',
          eta: '1-2 days',
          cost_cents: 4900
        }
      ];
    }
  };
}
