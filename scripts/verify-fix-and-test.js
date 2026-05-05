#!/usr/bin/env node

/**
 * Verification and Testing Script
 * 
 * This script:
 * 1. Verifies product duplicates were fixed
 * 2. Tests stock deduction for orders
 * 3. Checks analytics data integrity
 * 4. Validates admin/website sync
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yvmnedjybrpvlupygusf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI'
);

async function runVerification() {
  console.log('🔍 COMPREHENSIVE SYSTEM VERIFICATION\n');
  
  try {
    // 1. Check for remaining duplicates
    console.log('1. CHECKING PRODUCT DUPLICATES...');
    const { data: duplicates, error: dupError } = await supabase
      .from('products')
      .select('name, id, sku, is_active')
      .eq('is_active', true);
      
    if (dupError) {
      console.error('❌ Error fetching products:', dupError);
      return;
    }
    
    const productGroups = {};
    duplicates.forEach(product => {
      const normalizedName = product.name.trim().toLowerCase();
      if (!productGroups[normalizedName]) {
        productGroups[normalizedName] = [];
      }
      productGroups[normalizedName].push(product);
    });
    
    const remainingDuplicates = Object.keys(productGroups).filter(name => 
      productGroups[name].length > 1
    );
    
    if (remainingDuplicates.length > 0) {
      console.log('🚨 STILL HAVE DUPLICATES:');
      remainingDuplicates.forEach(name => {
        console.log(`   "${name}":`, productGroups[name].map(p => p.id));
      });
    } else {
      console.log('✅ NO DUPLICATES FOUND - FIX SUCCESSFUL!');
    }
    
    // 2. Check specific products mentioned in the problem
    console.log('\n2. CHECKING KEY PRODUCTS...');
    const keyProducts = ['Fairy Dust Top Coat', 'Orchid Manicure Table'];
    
    for (const productName of keyProducts) {
      const { data: products } = await supabase
        .from('products')
        .select('id, name, stock, sku, is_active')
        .eq('name', productName);
        
      if (products && products.length > 0) {
        console.log(`   ${productName}:`);
        products.forEach(p => {
          console.log(`      ✅ ID: ${p.id}`);
          console.log(`         Stock: ${p.stock}`);
          console.log(`         SKU: ${p.sku || 'None'}`);
          console.log(`         Active: ${p.is_active}`);
        });
      } else {
        console.log(`   ❌ ${productName} - NOT FOUND`);
      }
    }
    
    // 3. Check stock movements for these products
    console.log('\n3. CHECKING STOCK MOVEMENTS...');
    const fairyId = '23277fea-c7dc-4cbe-8efe-7f5b58718f81';
    const orchidId = 'a85cf490-9ae1-4a44-97f4-5918b4b03687';
    
    for (const [name, id] of [['Fairy Dust Top Coat', fairyId], ['Orchid Manicure Table', orchidId]]) {
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      console.log(`   ${name}: ${movements?.length || 0} stock movements`);
      if (movements && movements.length > 0) {
        movements.forEach(m => {
          console.log(`      ${m.movement_type}: ${m.quantity} units (${m.created_at})`);
        });
      }
    }
    
    // 4. Check recent orders with these products
    console.log('\n4. CHECKING RECENT ORDERS...');
    const { data: recentOrders } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, created_at,
        order_items (
          product_id, name, quantity, unit_price_cents
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (recentOrders) {
      console.log(`   Found ${recentOrders.length} recent orders`);
      
      for (const order of recentOrders) {
        const hasKeyProducts = order.order_items?.some(item => 
          [fairyId, orchidId].includes(item.product_id)
        );
        
        if (hasKeyProducts) {
          console.log(`   Order ${order.order_number} contains key products:`);
          order.order_items?.forEach(item => {
            if ([fairyId, orchidId].includes(item.product_id)) {
              console.log(`      ${item.name}: ${item.quantity} units`);
            }
          });
        }
      }
    }
    
    // 5. Test stock deduction function
    console.log('\n5. TESTING STOCK DEDUCTION...');
    
    // Get a test product with stock
    const { data: testProducts } = await supabase
      .from('products')
      .select('id, name, stock')
      .gt('stock', 0)
      .limit(1);
      
    if (testProducts && testProducts.length > 0) {
      const testProduct = testProducts[0];
      const initialStock = testProduct.stock;
      
      console.log(`   Testing with product: ${testProduct.name}`);
      console.log(`   Initial stock: ${initialStock}`);
      
      // Create a test order
      const { data: testOrder } = await supabase
        .from('orders')
        .insert({
          order_number: `TEST-${Date.now()}`,
          status: 'created',
          buyer_name: 'Test Customer',
          total_cents: 1000
        })
        .select()
        .single();
        
      if (testOrder) {
        // Add order item
        const { data: orderItem } = await supabase
          .from('order_items')
          .insert({
            order_id: testOrder.id,
            product_id: testProduct.id,
            name: testProduct.name,
            quantity: 1,
            unit_price_cents: 1000
          })
          .select()
          .single();
          
        if (orderItem) {
          // Mark order as paid to trigger stock deduction
          await supabase
            .from('orders')
            .update({ 
              status: 'paid', 
              paid_at: new Date().toISOString() 
            })
            .eq('id', testOrder.id);
            
          // Wait a moment for trigger to execute
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if stock was deducted
          const { data: updatedProduct } = await supabase
            .from('products')
            .select('stock')
            .eq('id', testProduct.id)
            .single();
            
          if (updatedProduct) {
            const newStock = updatedProduct.stock;
            console.log(`   New stock: ${newStock}`);
            
            if (newStock === initialStock - 1) {
              console.log('   ✅ STOCK DEDUCTION WORKING!');
            } else {
              console.log('   ❌ STOCK DEDUCTION FAILED');
            }
          }
          
          // Check stock movements
          const { data: newMovements } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('product_id', testProduct.id)
            .order('created_at', { ascending: false })
            .limit(2);
            
          if (newMovements && newMovements.length > 0) {
            console.log('   Recent stock movements:');
            newMovements.forEach(m => {
              console.log(`      ${m.movement_type}: ${m.quantity} units`);
            });
          }
          
          // Clean up test data
          await supabase.from('order_items').delete().eq('id', orderItem.id);
          await supabase.from('orders').delete().eq('id', testOrder.id);
        }
      }
    } else {
      console.log('   ⚠️ No products with stock available for testing');
    }
    
    console.log('\n✅ VERIFICATION COMPLETE!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

runVerification();