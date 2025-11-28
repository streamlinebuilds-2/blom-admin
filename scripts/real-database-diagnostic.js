#!/usr/bin/env node

/**
 * Real Database State Diagnostic
 * 
 * This script checks what's actually in your database
 * and why the stock deduction/analytics aren't working.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yvmnedjybrpvlupygusf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI'
);

async function runRealDiagnostic() {
  console.log('🔍 REAL DATABASE STATE DIAGNOSTIC\n');
  
  try {
    // 1. Check existing orders and their status
    console.log('1. CHECKING EXISTING ORDERS...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, created_at, paid_at,
        buyer_name, buyer_email, total_cents, subtotal_cents,
        fulfillment_type
      `)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return;
    }
    
    console.log(`Found ${orders?.length || 0} orders:`);
    orders?.forEach(order => {
      console.log(`   📦 ${order.order_number || order.id.slice(0,8)}: ${order.status} - R${(order.total_cents || 0)/100} - ${order.created_at}`);
    });
    
    // 2. Check order items for these orders
    console.log('\n2. CHECKING ORDER ITEMS...');
    const recentOrderIds = orders?.slice(0, 5).map(o => o.id) || [];
    
    if (recentOrderIds.length > 0) {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id, order_id, product_id, name, quantity, unit_price_cents,
          orders!inner (order_number, status)
        `)
        .in('order_id', recentOrderIds);
        
      if (itemsError) {
        console.error('❌ Error fetching order items:', itemsError);
      } else {
        console.log(`Found ${orderItems?.length || 0} order items:`);
        orderItems?.forEach(item => {
          console.log(`   📋 ${item.orders.order_number}: ${item.name} (Qty: ${item.quantity}) - Product ID: ${item.product_id}`);
        });
      }
    }
    
    // 3. Check products table structure and data
    console.log('\n3. CHECKING PRODUCTS TABLE...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, stock, sku, is_active, price_cents, cost_price_cents')
      .eq('is_active', true)
      .limit(10);
      
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
    } else {
      console.log(`Found ${products?.length || 0} active products:`);
      products?.forEach(product => {
        console.log(`   🏷️ ${product.name}: Stock=${product.stock}, SKU=${product.sku || 'None'}`);
      });
    }
    
    // 4. Check stock movements
    console.log('\n4. CHECKING STOCK MOVEMENTS...');
    const { data: stockMovements, error: movementsError } = await supabase
      .from('stock_movements')
      .select(`
        id, product_id, movement_type, quantity, order_id, created_at, notes,
        products!inner (name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (movementsError) {
      console.error('❌ Error fetching stock movements:', movementsError);
    } else {
      console.log(`Found ${stockMovements?.length || 0} stock movements:`);
      stockMovements?.forEach(movement => {
        console.log(`   📊 ${movement.products?.name}: ${movement.movement_type} ${movement.quantity} (${movement.created_at})`);
      });
    }
    
    // 5. Check if adjust_stock_for_order function exists
    console.log('\n5. CHECKING STOCK DEDUCTION FUNCTION...');
    try {
      const { data: functionTest, error: functionError } = await supabase
        .rpc('adjust_stock_for_order', { p_order_id: 'test-nonexistent' });
        
      if (functionError && functionError.message.includes('function') && functionError.message.includes('does not exist')) {
        console.log('❌ adjust_stock_for_order function does NOT exist');
      } else {
        console.log('✅ adjust_stock_for_order function exists');
      }
    } catch (err) {
      console.log('❌ Error testing stock function:', err);
    }
    
    // 6. Test analytics query directly
    console.log('\n6. TESTING ANALYTICS QUERY...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const fromIso = thirtyDaysAgo.toISOString();
    
    const { data: analyticsTest, error: analyticsError } = await supabase
      .from('order_items')
      .select(`
        product_id, name, quantity, line_total_cents,
        orders!inner (id, created_at, status, customer_email, total_cents)
      `)
      .gte('orders.created_at', fromIso)
      .eq('orders.status', 'paid');
      
    if (analyticsError) {
      console.error('❌ Analytics query error:', analyticsError);
    } else {
      console.log(`✅ Analytics query successful: Found ${analyticsTest?.length || 0} items from paid orders`);
      if (analyticsTest && analyticsTest.length > 0) {
        analyticsTest.slice(0, 3).forEach(item => {
          console.log(`   📈 ${item.name}: ${item.quantity} units, R${(item.line_total_cents || 0)/100}`);
        });
      }
    }
    
    // 7. Check database schema for orders table
    console.log('\n7. CHECKING ORDERS TABLE SCHEMA...');
    const { data: schema, error: schemaError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'orders')
      .eq('table_schema', 'public')
      .order('ordinal_position');
      
    if (schemaError) {
      console.log('⚠️ Could not fetch schema via information_schema');
    } else {
      console.log('Orders table columns:');
      schema?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
}

runRealDiagnostic();