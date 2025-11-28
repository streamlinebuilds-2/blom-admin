#!/usr/bin/env node

/**
 * API Deployment Test Script
 * 
 * Tests if the admin-order-status endpoint is working correctly
 */

async function testAPIEndpoint() {
  const orderId = '9f9e0f93-e380-4756-ae78-ff08a22cc7c9';
  const testUrl = 'https://blom-admin.netlify.app/.netlify/functions/admin-order-status';
  
  console.log('🧪 Testing API Endpoint Deployment...');
  console.log('Order ID:', orderId);
  console.log('API URL:', testUrl);
  
  try {
    // Test 1: Basic endpoint availability
    console.log('\n1. TESTING ENDPOINT AVAILABILITY...');
    
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: orderId,
        status: 'packed'
      })
    });
    
    console.log('📡 Response Status:', response.status);
    
    if (!response.ok) {
      console.log('❌ API Endpoint Not Available');
      console.log('Response:', await response.text());
      return;
    }
    
    console.log('✅ API Endpoint Available');
    
    // Test 2: Parse response
    console.log('\n2. PARSING RESPONSE...');
    const data = await response.json();
    console.log('📦 Response Data:', JSON.stringify(data, null, 2));
    
    // Test 3: Analyze results
    console.log('\n3. ANALYZING RESULTS...');
    
    if (data.ok) {
      console.log('✅ API reports success');
    } else {
      console.log('❌ API reports failure:', data.error);
      return;
    }
    
    if (data.order && data.order.status === 'packed') {
      console.log('✅ Database update successful - status is now PACKED');
    } else {
      console.log('❌ Database update failed - status is still:', data.order?.status);
    }
    
    if (data.webhookCalled) {
      console.log('✅ Webhook was called');
    } else {
      console.log('❌ Webhook was NOT called');
      if (data.webhookOk) {
        console.log('   (Note: webhookOk=true means no webhook needed for this status)');
      }
    }
    
    // Test 4: Test with curl to bypass any frontend issues
    console.log('\n4. TESTING WITH CURL...');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Use built-in fetch if available, otherwise show manual test
if (typeof fetch === 'undefined') {
  console.log('❌ Node.js fetch not available');
  console.log('🔧 Manual test:');
  console.log(`curl -X POST "https://blom-admin.netlify.app/.netlify/functions/admin-order-status" \\`);
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"id": "9f9e0f93-e380-4756-ae78-ff08a22cc7c9", "status": "packed"}\'');
} else {
  testAPIEndpoint();
}