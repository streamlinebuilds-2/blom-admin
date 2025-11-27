#!/usr/bin/env node

/**
 * Order Dashboard Diagnostic Script
 * 
 * This script diagnoses order pricing and delivery address issues by:
 * 1. Checking database schema for orders and order_items tables
 * 2. Examining recent orders and their data structure
 * 3. Identifying missing fields or data inconsistencies
 * 4. Providing actionable solutions
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables (replace with actual values)
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runDiagnostics() {
  console.log('🔍 ORDER DASHBOARD DIAGNOSTIC STARTING...\n');
  
  try {
    // 1. Check database schema
    console.log('1. CHECKING DATABASE SCHEMA...');
    await checkDatabaseSchema();
    
    // 2. Examine recent orders
    console.log('\n2. EXAMINING RECENT ORDERS...');
    await examineRecentOrders();
    
    // 3. Check for data inconsistencies
    console.log('\n3. CHECKING FOR DATA INCONSISTENCIES...');
    await checkDataConsistency();
    
    // 4. Analyze the root causes
    console.log('\n4. ANALYZING ROOT CAUSES...');
    await analyzeRootCauses();
    
    console.log('\n✅ DIAGNOSTIC COMPLETE - Check analysis above for detailed findings');
    
  } catch (error) {
    console.error('❌ DIAGNOSTIC FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

async function checkDatabaseSchema() {
  // Check orders table structure
  const { data: ordersSchema, error: ordersError } = await supabase
    .rpc('get_table_schema', { table_name: 'orders' });
  
  if (ordersError) {
    console.log('   ⚠️  Cannot fetch orders schema via RPC, checking via direct query...');
    // Alternative approach: check via information_schema
    const { data: schemaData } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'orders')
      .eq('table_schema', 'public');
    
    if (schemaData) {
      console.log('   📋 Orders table columns:');
      schemaData.forEach(col => {
        console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
      });
    }
  }
  
  // Check order_items table structure
  const { data: itemsSchema, error: itemsError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'order_items')
    .eq('table_schema', 'public');
  
  if (itemsSchema) {
    console.log('   📋 Order items table columns:');
    itemsSchema.forEach(col => {
      console.log(`      - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
  }
}

async function examineRecentOrders() {
  // Get recent orders with their items
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      customer_name,
      customer_email,
      buyer_name,
      buyer_email,
      status,
      total_cents,
      subtotal_cents,
      shipping_cents,
      shipping_address,
      fulfillment_type,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (ordersError) {
    console.log('   ❌ Error fetching orders:', ordersError.message);
    return;
  }
  
  if (!orders || orders.length === 0) {
    console.log('   ⚠️  No orders found in database');
    return;
  }
  
  console.log(`   📦 Found ${orders.length} recent orders`);
  
  for (const order of orders) {
    console.log(`\n   📋 Order ${order.order_number || order.id.slice(0, 8)}:`);
    console.log(`      Status: ${order.status}`);
    console.log(`      Customer: ${order.customer_name || order.buyer_name || 'N/A'}`);
    console.log(`      Email: ${order.customer_email || order.buyer_email || 'N/A'}`);
    console.log(`      Total: R${(order.total_cents || 0) / 100}`);
    console.log(`      Subtotal: R${(order.subtotal_cents || 0) / 100}`);
    console.log(`      Shipping: R${(order.shipping_cents || 0) / 100}`);
    console.log(`      Shipping Address: ${order.shipping_address ? '✓ Present' : '❌ Missing'}`);
    console.log(`      Fulfillment Type: ${order.fulfillment_type || 'N/A'}`);
    
    // Get order items for this order
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id);
    
    if (itemsError) {
      console.log(`      ❌ Error fetching items: ${itemsError.message}`);
      continue;
    }
    
    console.log(`      📦 Items (${items?.length || 0}):`);
    if (items && items.length > 0) {
      items.forEach((item, i) => {
        console.log(`         ${i + 1}. ${item.product_name || item.name || 'Unknown Product'}`);
        console.log(`            Qty: ${item.quantity || 0}`);
        console.log(`            Unit Price: R${(item.unit_price_cents || item.price || 0) / 100}`);
        console.log(`            Line Total: R${(item.line_total_cents || item.total || 0) / 100}`);
        console.log(`            Variant: ${item.variant || 'None'}`);
      });
    } else {
      console.log(`         ❌ No items found`);
    }
  }
}

async function checkDataConsistency() {
  console.log('   🔍 Checking pricing data consistency...');
  
  // Check orders with zero pricing
  const { data: zeroPriceOrders } = await supabase
    .from('orders')
    .select('id, order_number, total_cents, subtotal_cents')
    .eq('total_cents', 0);
  
  if (zeroPriceOrders && zeroPriceOrders.length > 0) {
    console.log(`   ⚠️  Found ${zeroPriceOrders.length} orders with zero total pricing`);
    
    // Sample a few to see details
    for (const order of zeroPriceOrders.slice(0, 3)) {
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, unit_price_cents, line_total_cents')
        .eq('order_id', order.id);
      
      console.log(`      Order ${order.order_number}:`);
      console.log(`         Total in DB: R${(order.total_cents || 0) / 100}`);
      console.log(`         Items count: ${items?.length || 0}`);
      
      if (items && items.length > 0) {
        const calculatedTotal = items.reduce((sum, item) => {
          const unitPrice = item.unit_price_cents || 0;
          const qty = item.quantity || 0;
          const lineTotal = item.line_total_cents || (unitPrice * qty);
          return sum + lineTotal;
        }, 0);
        
        console.log(`         Calculated total from items: R${calculatedTotal / 100}`);
        console.log(`         Mismatch: ${calculatedTotal !== order.total_cents ? '❌ YES' : '✅ NO'}`);
      }
    }
  }
  
  // Check missing shipping addresses
  const { data: deliveryOrders } = await supabase
    .from('orders')
    .select('id, order_number, shipping_address, fulfillment_type')
    .eq('fulfillment_type', 'delivery');
  
  if (deliveryOrders) {
    const missingAddresses = deliveryOrders.filter(order => !order.shipping_address);
    if (missingAddresses.length > 0) {
      console.log(`   ⚠️  Found ${missingAddresses.length} delivery orders missing shipping addresses`);
      console.log(`      Sample orders: ${missingAddresses.slice(0, 3).map(o => o.order_number).join(', ')}`);
    } else {
      console.log('   ✅ All delivery orders have shipping addresses');
    }
  }
}

async function analyzeRootCauses() {
  console.log('   🧐 ANALYZING ROOT CAUSES...');
  console.log('\n   📊 POTENTIAL ISSUES IDENTIFIED:');
  console.log('\n   1. PRICING ISSUES (R0.00 Display):');
  console.log('      • Database fields might not exist: unit_price_cents, line_total_cents');
  console.log('      • Data might be stored in different field names: price, total');
  console.log('      • Currency conversion issues (cents vs rands)');
  console.log('      • Missing or null pricing data in order_items');
  
  console.log('\n   2. MISSING DELIVERY ADDRESS:');
  console.log('      • shipping_address field might not exist in orders table');
  console.log('      • Data might be stored in different field: delivery_address');
  console.log('      • Address data might be null/empty for some orders');
  console.log('      • Fulfillment type logic might be incorrect');
  
  console.log('\n   🔧 RECOMMENDED FIXES:');
  console.log('\n   STEP 1: Fix Database Schema');
  console.log('      - Ensure orders table has: shipping_address, total_cents, subtotal_cents');
  console.log('      - Ensure order_items table has: unit_price_cents, line_total_cents, quantity');
  
  console.log('\n   STEP 2: Update Frontend Field Mapping');
  console.log('      - Check OrderDetail.jsx field mappings');
  console.log('      - Ensure formatMoney function handles missing/null values');
  console.log('      - Add fallback for missing shipping address');
  
  console.log('\n   STEP 3: Backend Function Updates');
  console.log('      - Update admin-order.ts to include all required fields');
  console.log('      - Add error handling for missing data');
  console.log('      - Ensure proper joins if data is split across tables');
  
  console.log('\n   STEP 4: Data Migration (if needed)');
  console.log('      - Migrate data from old field names to new ones');
  console.log('      - Update existing orders with missing shipping addresses');
  console.log('      - Recalculate totals based on order_items data');
}

// Run the diagnostic
runDiagnostics().catch(console.error);