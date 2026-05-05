const fetch = require('node-fetch');

async function testAPIEndpoints() {
  const orderId = '9f9e0f93-e380-4756-ae78-ff08a22cc7c9';
  
  console.log('🧪 Testing API Endpoints for Order Status Update...');
  console.log('Order ID:', orderId);
  
  // Test different possible API paths
  const endpoints = [
    '/.netlify/functions/admin-order-status',
    '/admin-order-status',
    '/.netlify/functions/admin-db-operation'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔗 Testing endpoint: ${endpoint}`);
    
    try {
      const response = await fetch(`https://blom-admin.netlify.app${endpoint}`, {
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
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS Response:', JSON.stringify(data, null, 2));
        
        // If this endpoint works, break out
        if (data.ok) {
          console.log('🎉 Found working endpoint!');
          break;
        }
      } else {
        const errorText = await response.text();
        console.log('❌ ERROR Response:', errorText);
      }
      
    } catch (err) {
      console.error('💥 Request failed:', err.message);
    }
  }
  
  // Test the direct database operation path
  console.log('\n🗄️ Testing admin-db-operation endpoint...');
  try {
    const dbResponse = await fetch('https://blom-admin.netlify.app/.netlify/functions/admin-db-operation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operation: 'update_order_status',
        order_id: orderId,
        new_status: 'packed',
        current_status: 'paid'
      })
    });
    
    console.log('📊 DB Operation Response Status:', dbResponse.status);
    
    if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      console.log('✅ DB Operation Response:', JSON.stringify(dbData, null, 2));
    } else {
      const dbError = await dbResponse.text();
      console.log('❌ DB Operation Error:', dbError);
    }
    
  } catch (err) {
    console.error('💥 DB Operation failed:', err.message);
  }
}

testAPIEndpoints();