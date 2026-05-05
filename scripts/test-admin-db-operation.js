#!/usr/bin/env node

/**
 * Direct API Test for admin-db-operation endpoint
 * Tests if the environment variables and database access are working
 */

async function testAdminDBOperation() {
  const orderId = '9f9e0f93-e380-4756-ae78-ff08a22cc7c9';
  const testUrl = 'https://blom-admin.netlify.app/.netlify/functions/admin-db-operation';
  
  console.log('🧪 Testing admin-db-operation Endpoint...');
  console.log('Order ID:', orderId);
  console.log('API URL:', testUrl);
  
  try {
    // Test 1: Basic connectivity
    console.log('\n1. TESTING BASIC CONNECTIVITY...');
    const testResponse = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'select', table: 'orders', data: 'id,status', filters: { id: orderId } })
    });
    
    console.log('📡 Test Response Status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.log('❌ Basic test failed:', errorText);
      return;
    }
    
    const testData = await testResponse.json();
    console.log('✅ Basic connectivity OK');
    console.log('📦 Response:', JSON.stringify(testData, null, 2));
    
    // Test 2: Direct order status update
    console.log('\n2. TESTING ORDER STATUS UPDATE...');
    const updateResponse = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'update_order_status',
        order_id: orderId,
        new_status: 'packed',
        current_status: 'paid'
      })
    });
    
    console.log('📡 Update Response Status:', updateResponse.status);
    
    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.log('❌ Update test failed:', errorText);
      return;
    }
    
    const updateData = await updateResponse.json();
    console.log('✅ Update response:', JSON.stringify(updateData, null, 2));
    
    // Test 3: Verify the change persisted
    console.log('\n3. VERIFYING DATABASE UPDATE...');
    
    // Wait a moment for the database to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const verifyResponse = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'select',
        table: 'orders',
        data: 'id,status,order_packed_at',
        filters: { id: orderId }
      })
    });
    
    console.log('📡 Verify Response Status:', verifyResponse.status);
    
    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.log('❌ Verify test failed:', errorText);
      return;
    }
    
    const verifyData = await verifyResponse.json();
    console.log('✅ Verify response:', JSON.stringify(verifyData, null, 2));
    
    // Analyze results
    console.log('\n4. ANALYZING RESULTS...');
    const order = verifyData.data?.[0];
    
    if (order && order.status === 'packed') {
      console.log('🎉 SUCCESS: Order status updated to PACKED!');
      console.log('📅 Packed at:', order.order_packed_at);
      console.log('💡 The API is working correctly.');
      console.log('🔧 If the frontend still shows "PAID", it may be a caching issue.');
    } else {
      console.log('❌ FAILED: Order status is still:', order?.status || 'unknown');
      console.log('💡 This indicates a database/permission issue.');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.log('\n🔧 SUGGESTED FIXES:');
    console.log('1. Check Netlify environment variables are set');
    console.log('2. Verify SUPABASE_SERVICE_ROLE_KEY is correct');
    console.log('3. Ensure database permissions allow updates');
  }
}

testAdminDBOperation();