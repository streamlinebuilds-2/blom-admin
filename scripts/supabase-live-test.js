#!/usr/bin/env node

/**
 * Supabase Live Database Connection Test
 * This script connects to your Supabase database and runs real queries
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yvmnedjybrpvlupygusf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDk2NDMsImV4cCI6MjA3NDE4NTY0M30.jyT8CC7oRMCg4vnMVmeRc0lZ_Ct7VANuRIfx20qx8aE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🚀 SUPABASE LIVE DATABASE TEST\n');
  console.log('=' .repeat(60));
  console.log(`📡 URL: ${SUPABASE_URL}`);
  console.log('=' .repeat(60) + '\n');

  try {
    // Test 1: Count all tables
    console.log('📊 TEST 1: Counting records in all tables...\n');

    const tables = [
      'products',
      'orders',
      'order_items',
      'bundles',
      'bundle_items',
      'product_reviews',
      'contacts',
      'contact_messages',
      'payments',
      'stock_movements',
      'restocks',
      'restock_items',
      'operating_costs'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`   ❌ ${table.padEnd(20)} - ERROR: ${error.message}`);
        } else {
          console.log(`   ✅ ${table.padEnd(20)} - ${count || 0} records`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${table.padEnd(20)} - ${e.message}`);
      }
    }

    // Test 2: Get sample products
    console.log('\n📦 TEST 2: Sample Products...\n');
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, slug, status, price, stock, created_at')
      .limit(5);

    if (prodError) {
      console.log(`   ❌ Error: ${prodError.message}`);
    } else {
      products.forEach(p => {
        console.log(`   • ${p.name} (${p.slug})`);
        console.log(`     Status: ${p.status} | Price: R${p.price} | Stock: ${p.stock}`);
      });
    }

    // Test 3: Get recent orders
    console.log('\n🛒 TEST 3: Recent Orders...\n');
    const { data: orders, error: ordError } = await supabase
      .from('orders')
      .select('id, m_payment_id, status, total, buyer_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (ordError) {
      console.log(`   ❌ Error: ${ordError.message}`);
    } else if (orders.length === 0) {
      console.log('   (No orders found)');
    } else {
      orders.forEach(o => {
        console.log(`   • Order ${o.m_payment_id || o.id}`);
        console.log(`     Customer: ${o.buyer_name} | Total: R${o.total} | Status: ${o.status}`);
      });
    }

    // Test 4: Get reviews
    console.log('\n⭐ TEST 4: Product Reviews...\n');
    const { data: reviews, error: revError } = await supabase
      .from('product_reviews')
      .select('id, reviewer_name, rating, status, created_at')
      .limit(5);

    if (revError) {
      console.log(`   ❌ Error: ${revError.message}`);
    } else if (reviews.length === 0) {
      console.log('   (No reviews found)');
    } else {
      reviews.forEach(r => {
        console.log(`   • ${r.reviewer_name} - ${'⭐'.repeat(r.rating)} (${r.status})`);
      });
    }

    // Test 5: Check RLS policies (this will tell us what we can access)
    console.log('\n🔒 TEST 5: Testing Row Level Security...\n');

    // Try to read from tables with RLS
    const rlsTests = [
      { table: 'products', expected: 'public read' },
      { table: 'product_reviews', expected: 'approved only for anon' },
      { table: 'orders', expected: 'authenticated only' },
      { table: 'contacts', expected: 'authenticated only' }
    ];

    for (const test of rlsTests) {
      const { data, error } = await supabase
        .from(test.table)
        .select('id')
        .limit(1);

      if (error) {
        console.log(`   🔒 ${test.table.padEnd(20)} - BLOCKED (${error.message})`);
      } else {
        console.log(`   ✅ ${test.table.padEnd(20)} - ACCESSIBLE (${test.expected})`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ CONNECTION TEST COMPLETE!');
    console.log('='.repeat(60) + '\n');

    return true;
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
