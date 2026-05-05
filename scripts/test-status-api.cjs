const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

async function testStatusAPI() {
  const orderId = '9f9e0f93-e380-4756-ae78-ff08a22cc7c9';
  
  console.log('🧪 Testing Order Status API...');
  console.log('Order ID:', orderId);
  
  try {
    // First, get the current order status
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: currentOrder, error } = await supabase
      .from('orders')
      .select('id, status, fulfillment_type')
      .eq('id', orderId)
      .single();
    
    if (error || !currentOrder) {
      console.error('❌ Error fetching current order:', error);
      return;
    }
    
    console.log('📋 Current order status:', currentOrder.status);
    console.log('📋 Fulfillment type:', currentOrder.fulfillment_type);
    
    // Test the API endpoint
    console.log('🌐 Testing API endpoint...');
    const response = await fetch('https://blom-admin.netlify.app/.netlify/functions/admin-order-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: orderId,
        status: 'packed'
      })
    });
    
    console.log('📡 API Response Status:', response.status);
    const responseData = await response.json();
    console.log('📦 API Response:', JSON.stringify(responseData, null, 2));
    
    // Check if database was updated
    console.log('\n🔍 Checking database update...');
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .select('id, status, order_packed_at')
      .eq('id', orderId)
      .single();
    
    if (updateError || !updatedOrder) {
      console.error('❌ Error fetching updated order:', updateError);
      return;
    }
    
    console.log('✅ Updated order status:', updatedOrder.status);
    console.log('📅 Packed at:', updatedOrder.order_packed_at);
    
    if (updatedOrder.status === 'packed') {
      console.log('🎉 SUCCESS: Database was updated successfully!');
    } else {
      console.log('❌ FAILED: Database was not updated');
    }
    
  } catch (err) {
    console.error('💥 Test failed:', err.message);
  }
}

testStatusAPI();