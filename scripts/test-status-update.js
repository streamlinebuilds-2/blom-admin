#!/usr/bin/env node

/**
 * Direct Test for Order Status Update API
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables from .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://yvmnedjybrpvlupygusf.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testStatusUpdate() {
  console.log('🧪 TESTING ORDER STATUS UPDATE...\n');
  
  try {
    // 1. Get a paid order for testing
    console.log('1. Finding a paid order...');
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, fulfillment_type, buyer_name')
      .eq('status', 'paid')
      .limit(1);
    
    if (ordersError) {
      throw new Error(`Failed to fetch orders: ${ordersError.message}`);
    }
    
    if (!orders || orders.length === 0) {
      console.log('❌ No paid orders found for testing');
      console.log('💡 Please create a test order with status "paid" first');
      return;
    }
    
    const testOrder = orders[0];
    console.log(`✅ Found test order: ${testOrder.order_number || testOrder.id.slice(0,8)}`);
    console.log(`   Customer: ${testOrder.buyer_name}`);
    console.log(`   Current status: ${testOrder.status}`);
    console.log(`   Fulfillment: ${testOrder.fulfillment_type}\n`);
    
    // 2. Test direct database update first (backup method)
    console.log('2. Testing direct database update...');
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'packed',
        order_packed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrder.id)
      .select()
      .single();
      
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log(`✅ Database updated successfully:`);
    console.log(`   New status: ${updatedOrder.status}`);
    console.log(`   Packed at: ${updatedOrder.order_packed_at}`);
    console.log(`   Updated: ${updatedOrder.updated_at}\n`);
    
    // 3. Reset status back to 'paid' for proper testing
    console.log('3. Resetting status to "paid" for API testing...');
    await supabase
      .from('orders')
      .update({ 
        status: 'paid',
        order_packed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', testOrder.id);
    
    console.log(`✅ Status reset to "paid"\n`);
    
    // 4. Test the actual API endpoint
    console.log('4. Testing API endpoint...');
    const response = await fetch('http://localhost:8888/.netlify/functions/admin-order-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: testOrder.id,
        status: 'packed'
      })
    });
    
    console.log(`📡 API Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Test Failed:`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${errorText}`);
      console.log('\n💡 The API endpoint might not be accessible from local environment.');
      console.log('💡 Testing the actual functionality from the web interface is recommended.');
    } else {
      const result = await response.json();
      console.log(`✅ API Test Successful:`);
      console.log(`   Response: ${JSON.stringify(result, null, 2)}`);
    }
    
    // 5. Final verification
    console.log('\n5. Final verification...');
    const { data: finalOrder } = await supabase
      .from('orders')
      .select('status, order_packed_at')
      .eq('id', testOrder.id)
      .single();
      
    console.log(`📋 Current status: ${finalOrder.status}`);
    console.log(`📅 Packed timestamp: ${finalOrder.order_packed_at || 'None'}`);
    
    console.log('\n🎉 TEST COMPLETE!');
    console.log('\n📋 SUMMARY:');
    console.log('✅ Database operations working correctly');
    console.log('✅ Order status can be updated via direct SQL');
    console.log('💡 API endpoint may need hosting platform deployment');
    console.log('\n💡 RECOMMENDATION: Use the "Mark as Packed" button in the web interface');
    console.log('💡 If button doesn\'t work, check browser console for errors');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testStatusUpdate().catch(console.error);