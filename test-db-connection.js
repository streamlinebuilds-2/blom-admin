#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Test connection to your Supabase database
const supabase = createClient(
  'https://yvmnedjybrpvlupygusf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI'
);

async function testDatabase() {
  console.log('🔍 Testing Supabase Database Connection...');
  console.log(`📡 Project: yvmnedjybrpvlupygusf.supabase.co`);
  console.log(`🔑 Using service role key`);
  console.log('');
  
  try {
    // Test 1: Basic connection
    console.log('✅ Test 1: Basic Connection');
    const { data, error } = await supabase.from('orders').select('count').limit(1);
    if (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      console.log(`💡 Error details: ${error.details || 'No additional details'}`);
      return;
    }
    console.log('✅ Database connected successfully');
    console.log('');

    // Test 2: Get table schema
    console.log('✅ Test 2: Check Orders Table Schema');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(1);
      
    if (ordersError) {
      console.log(`❌ Error accessing orders table: ${ordersError.message}`);
    } else {
      console.log('✅ Orders table accessible');
      if (orders && orders.length > 0) {
        console.log(`📋 Sample order structure:`, Object.keys(orders[0]));
      }
    }
    console.log('');

    // Test 3: Get some actual data
    console.log('✅ Test 3: Fetch Sample Data');
    const { data: sampleOrders, error: sampleError } = await supabase
      .from('orders')
      .select('id, status, buyer_name, total_cents, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (sampleError) {
      console.log(`❌ Error fetching orders: ${sampleError.message}`);
    } else {
      console.log(`📊 Found ${sampleOrders.length} orders:`);
      sampleOrders.forEach(order => {
        console.log(`   - ${order.id}: ${order.status} | ${order.buyer_name} | R${(order.total_cents/100).toFixed(2)}`);
      });
    }
    console.log('');

    // Test 4: Check other tables
    console.log('✅ Test 4: Check Other Tables');
    const tables = ['products', 'bundles', 'contacts', 'coupons'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (!error) {
          console.log(`   ✅ ${table} table: accessible`);
        } else {
          console.log(`   ❌ ${table} table: ${error.message}`);
        }
      } catch (err) {
        console.log(`   ❌ ${table} table: unexpected error`);
      }
    }
    
  } catch (err) {
    console.log(`❌ Unexpected error: ${err.message}`);
  }
}

testDatabase();