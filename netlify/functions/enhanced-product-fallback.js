/**
 * Enhanced Product Name-Based Fallback System
 * 
 * This function provides robust product matching using both IDs and names
 * to handle existing orders and prevent stock deduction failures.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface Product {
  id: string;
  name: string;
  stock: number;
  sku: string | null;
  is_active: boolean;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price_cents: number;
}

/**
 * Find product by ID, with fallback to name matching
 */
async function findProductRobust(productId: string | null, productName: string): Promise<Product | null> {
  // First try exact ID match
  if (productId) {
    const { data: productById } = await supabase
      .from('products')
      .select('id, name, stock, sku, is_active')
      .eq('id', productId)
      .single();
      
    if (productById && productById.is_active) {
      console.log(`✅ Found product by ID: ${productById.name} (${productId})`);
      return productById;
    }
  }
  
  // Fallback to name matching (case-insensitive, trimmed)
  const normalizedName = productName.trim().toLowerCase();
  const { data: productsByName } = await supabase
    .from('products')
    .select('id, name, stock, sku, is_active')
    .eq('is_active', true);
    
  if (productsByName) {
    // Try exact name match first
    let match = productsByName.find(p => 
      p.name.trim().toLowerCase() === normalizedName
    );
    
    // If no exact match, try partial name match
    if (!match) {
      match = productsByName.find(p => 
        p.name.trim().toLowerCase().includes(normalizedName) || 
        normalizedName.includes(p.name.trim().toLowerCase())
      );
    }
    
    if (match) {
      console.log(`✅ Found product by name fallback: ${match.name} (ID: ${match.id})`);
      return match;
    }
  }
  
  console.log(`❌ Product not found: ID=${productId}, Name="${productName}"`);
  return null;
}

/**
 * Enhanced stock deduction with name-based fallback
 */
export async function adjustStockForOrderWithFallback(orderId: string): Promise<{
  success: boolean;
  results: Array<{
    orderItemId: string;
    productName: string;
    originalProductId: string | null;
    foundProductId: string | null;
    quantity: number;
    stockBefore: number | null;
    stockAfter: number | null;
    method: 'id' | 'name' | 'failed';
    error?: string;
  }>;
  summary: {
    totalItems: number;
    successful: number;
    failed: number;
    fallbackUsed: number;
  };
}> {
  console.log(`🔧 Starting enhanced stock adjustment for order ${orderId}`);
  
  // Get order items
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('id, order_id, product_id, name, quantity, unit_price_cents')
    .eq('order_id', orderId);
    
  if (itemsError) {
    throw new Error(`Failed to fetch order items: ${itemsError.message}`);
  }
  
  if (!orderItems || orderItems.length === 0) {
    return {
      success: false,
      results: [],
      summary: { totalItems: 0, successful: 0, failed: 0, fallbackUsed: 0 }
    };
  }
  
  const results = [];
  let fallbackUsed = 0;
  
  for (const item of orderItems) {
    const result = {
      orderItemId: item.id,
      productName: item.name,
      originalProductId: item.product_id,
      foundProductId: null as string | null,
      quantity: item.quantity,
      stockBefore: null as number | null,
      stockAfter: null as number | null,
      method: 'failed' as 'id' | 'name' | 'failed',
      error: null as string | null
    };
    
    try {
      // Find product with fallback
      const product = await findProductRobust(item.product_id, item.name);
      
      if (!product) {
        result.error = `Product not found: ${item.name}`;
        results.push(result);
        continue;
      }
      
      result.foundProductId = product.id;
      result.method = item.product_id === product.id ? 'id' : 'name';
      if (result.method === 'name') fallbackUsed++;
      
      // Get current stock
      const { data: currentStock } = await supabase
        .from('products')
        .select('stock')
        .eq('id', product.id)
        .single();
        
      result.stockBefore = currentStock?.stock || 0;
      
      // Check if we have enough stock
      if ((currentStock?.stock || 0) < item.quantity) {
        result.error = `Insufficient stock: need ${item.quantity}, have ${currentStock?.stock || 0}`;
        results.push(result);
        continue;
      }
      
      // Deduct stock
      const newStock = (currentStock?.stock || 0) - item.quantity;
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);
        
      if (updateError) {
        result.error = `Failed to update stock: ${updateError.message}`;
        results.push(result);
        continue;
      }
      
      result.stockAfter = newStock;
      
      // Log stock movement
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: product.id,
          movement_type: 'sale',
          quantity: -item.quantity,
          order_id: orderId,
          notes: `Stock deducted for order ${orderId} via ${result.method} matching`,
          created_at: new Date().toISOString()
        });
        
      if (movementError) {
        console.warn(`⚠️ Failed to log stock movement: ${movementError.message}`);
      }
      
      console.log(`✅ Stock adjusted: ${product.name} (${item.quantity} units)`);
      
    } catch (error: any) {
      result.error = error.message;
    }
    
    results.push(result);
  }
  
  const successful = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  
  console.log(`📊 Stock adjustment complete: ${successful}/${results.length} successful, ${fallbackUsed} used fallback`);
  
  return {
    success: failed === 0,
    results,
    summary: {
      totalItems: results.length,
      successful,
      failed,
      fallbackUsed
    }
  };
}

/**
 * Repair existing orders with broken product references
 */
export async function repairBrokenOrderProducts(): Promise<{
  success: boolean;
  repaired: number;
  failed: number;
  details: Array<{
    orderItemId: string;
    orderId: string;
    originalProductId: string | null;
    productName: string;
    foundProductId: string | null;
    method: 'id' | 'name' | 'failed';
    error?: string;
  }>;
}> {
  console.log('🔧 Starting repair of broken order products...');
  
  // Find orders with potentially broken product references
  const { data: brokenItems, error } = await supabase
    .from('order_items')
    .select(`
      id, order_id, product_id, name, quantity,
      orders!inner (id, order_number)
    `)
    .not('product_id', 'is', null);
    
  if (error) {
    throw new Error(`Failed to fetch order items: ${error.message}`);
  }
  
  if (!brokenItems) {
    return { success: true, repaired: 0, failed: 0, details: [] };
  }
  
  let repaired = 0;
  let failed = 0;
  const details = [];
  
  for (const item of brokenItems) {
    const detail = {
      orderItemId: item.id,
      orderId: item.order_id,
      originalProductId: item.product_id,
      productName: item.name,
      foundProductId: null as string | null,
      method: 'failed' as 'id' | 'name' | 'failed',
      error: null as string | null
    };
    
    try {
      // Check if the product_id actually exists and is valid
      const { data: productCheck } = await supabase
        .from('products')
        .select('id, name, is_active')
        .eq('id', item.product_id)
        .single();
        
      if (!productCheck || !productCheck.is_active) {
        // Product ID is broken, try to find by name
        const product = await findProductRobust(item.product_id, item.name);
        
        if (product) {
          // Update the order item with correct product ID
          const { error: updateError } = await supabase
            .from('order_items')
            .update({ product_id: product.id })
            .eq('id', item.id);
            
          if (updateError) {
            detail.error = `Failed to update product ID: ${updateError.message}`;
            failed++;
          } else {
            detail.foundProductId = product.id;
            detail.method = 'name';
            repaired++;
            console.log(`✅ Repaired order item ${item.id}: ${item.name} -> ${product.id}`);
          }
        } else {
          detail.error = `No matching product found for "${item.name}"`;
          failed++;
        }
      } else {
        // Product ID is valid, no repair needed
        detail.foundProductId = item.product_id;
        detail.method = 'id';
      }
      
    } catch (error: any) {
      detail.error = error.message;
      failed++;
    }
    
    details.push(detail);
  }
  
  console.log(`📊 Repair complete: ${repaired} repaired, ${failed} failed`);
  
  return {
    success: failed === 0,
    repaired,
    failed,
    details
  };
}

/**
 * Analytics with enhanced product matching
 */
export async function getAnalyticsWithFallback(period: number = 30): Promise<{
  success: boolean;
  topProducts: Array<{
    id: string;
    name: string;
    totalUnitsSold: number;
    totalRevenueCents: number;
    totalOrders: number;
    method: 'id' | 'name' | 'hybrid';
  }>;
  summary: {
    totalProducts: number;
    idMatched: number;
    nameMatched: number;
  };
}> {
  console.log(`📊 Getting analytics with enhanced matching for ${period} days...`);
  
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - period);
  const fromIso = fromDate.toISOString();
  
  // Get order items with orders
  const { data: orderItems, error } = await supabase
    .from('order_items')
    .select(`
      id, product_id, name, quantity, line_total_cents, unit_price_cents,
      orders!inner (
        id, created_at, status, payment_status, customer_email
      )
    `)
    .gte('orders.created_at', fromIso)
    .eq('orders.status', 'paid');
    
  if (error) {
    throw new Error(`Failed to fetch order items: ${error.message}`);
  }
  
  if (!orderItems) {
    return {
      success: true,
      topProducts: [],
      summary: { totalProducts: 0, idMatched: 0, nameMatched: 0 }
    };
  }
  
  const productAnalytics = new Map();
  let idMatched = 0;
  let nameMatched = 0;
  
  for (const item of orderItems) {
    const product = await findProductRobust(item.product_id, item.name);
    
    if (!product) {
      console.warn(`⚠️ Product not found for analytics: ${item.name}`);
      continue;
    }
    
    const method = item.product_id === product.id ? 'id' : 'name';
    if (method === 'id') idMatched++;
    else nameMatched++;
    
    const key = product.id;
    
    if (!productAnalytics.has(key)) {
      productAnalytics.set(key, {
        id: product.id,
        name: product.name,
        totalUnitsSold: 0,
        totalRevenueCents: 0,
        totalOrders: 0,
        method: method as 'id' | 'name' | 'hybrid'
      });
    }
    
    const analytics = productAnalytics.get(key);
    analytics.totalUnitsSold += item.quantity || 0;
    analytics.totalRevenueCents += item.line_total_cents || 0;
    analytics.totalOrders += 1;
    
    // If we've seen this product via both methods, mark as hybrid
    if (analytics.method !== method && analytics.method !== 'hybrid') {
      analytics.method = 'hybrid';
    }
  }
  
  const topProducts = Array.from(productAnalytics.values())
    .sort((a, b) => b.totalUnitsSold - a.totalUnitsSold)
    .slice(0, 10);
  
  console.log(`📊 Analytics complete: ${topProducts.length} products, ${idMatched} ID matches, ${nameMatched} name matches`);
  
  return {
    success: true,
    topProducts,
    summary: {
      totalProducts: topProducts.length,
      idMatched,
      nameMatched
    }
  };
}