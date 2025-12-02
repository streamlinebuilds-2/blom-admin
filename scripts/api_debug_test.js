/**
 * API Debug Test Script
 * Tests the actual API calls to identify the frontend vs database disconnect
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

async function debugAPI() {
  console.log('🔍 Debugging API vs Database disconnect...\n');

  try {
    // Step 1: Test stock movements API directly
    console.log('📋 Step 1: Testing stock movements API...');
    const movementsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-stock-movements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const movementsData = await movementsResponse.json();
    console.log('📊 API Response:', movementsData);

    if (movementsData.ok && movementsData.data) {
      console.log(`✅ API returned ${movementsData.data.length} movements`);
      movementsData.data.slice(0, 3).forEach((movement, index) => {
        console.log(`  ${index + 1}. ${movement.product_name || 'Unknown'}: ${movement.delta} (${movement.reason})`);
      });
    } else {
      console.log('❌ API failed or returned no data');
    }

    // Step 2: Get a test product
    console.log('\n📋 Step 2: Getting test product...');
    const productsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const productsData = await productsResponse.json();
    const testProduct = productsData.data?.[0];

    if (!testProduct) {
      throw new Error('No products found for testing');
    }

    console.log(`🎯 Test product: ${testProduct.name} (Stock: ${testProduct.stock || 0})`);

    // Step 3: Test adjust-stock API call
    console.log('\n📋 Step 3: Testing adjust-stock API...');
    
    const adjustmentData = {
      productId: testProduct.id,
      delta: 3,
      reason: 'api_debug_test'
    };

    console.log('📤 Sending adjustment:', adjustmentData);

    const adjustmentResponse = await fetch(`${SUPABASE_URL}/functions/v1/adjust-stock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adjustmentData)
    });

    const adjustmentResult = await adjustmentResponse.json();
    console.log('📥 API Response:', adjustmentResult);

    // Step 4: Check if movement was created via API
    console.log('\n📋 Step 4: Checking for new movements...');
    
    const newMovementsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-stock-movements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const newMovementsData = await newMovementsResponse.json();
    const recentMovements = newMovementsData.data?.filter(m => 
      m.product_id === testProduct.id && 
      m.reason?.includes('api_debug_test')
    ) || [];

    console.log(`🎯 Found ${recentMovements.length} test movements`);

    if (recentMovements.length > 0) {
      console.log('✅ SUCCESS: API adjustment created movement!');
      recentMovements.forEach(movement => {
        console.log(`  - ${movement.product_name}: ${movement.delta} (${movement.reason})`);
      });
    } else {
      console.log('❌ FAILURE: API adjustment did NOT create movement!');
      
      // Check if the adjustment worked but logging failed
      console.log('\n🧐 Checking if stock was updated but logging failed...');
      
      // Get updated product stock
      const refreshedProductsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-products`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const refreshedProductsData = await refreshedProductsResponse.json();
      const refreshedProduct = refreshedProductsData.data?.find(p => p.id === testProduct.id);

      if (refreshedProduct) {
        const oldStock = testProduct.stock || 0;
        const newStock = refreshedProduct.stock || 0;
        const expectedNewStock = oldStock + 3;
        
        console.log(`Stock change: ${oldStock} → ${newStock} (expected: ${expectedNewStock})`);
        
        if (newStock === expectedNewStock) {
          console.log('✅ Stock was updated but movement logging failed!');
          console.log('🔧 ISSUE: Frontend calls database function but logging function fails');
        } else {
          console.log('❌ Stock was not updated at all!');
          console.log('🔧 ISSUE: Frontend API call to database function fails');
        }
      }
    }

    // Step 5: Test direct database call
    console.log('\n📋 Step 5: Testing direct database call...');
    
    // Test the database function directly via RPC
    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/log_stock_movement`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        p_product_id: testProduct.id,
        p_delta: 2,
        p_reason: 'direct_db_test'
      })
    });

    const rpcResult = await rpcResponse.json();
    console.log('🔬 Direct DB call result:', rpcResult);

    // Check if direct call created a movement
    const directMovementsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-stock-movements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const directMovementsData = await directMovementsResponse.json();
    const directMovements = directMovementsData.data?.filter(m => 
      m.product_id === testProduct.id && 
      m.reason?.includes('direct_db_test')
    ) || [];

    if (directMovements.length > 0) {
      console.log('✅ Direct database call worked!');
    } else {
      console.log('❌ Even direct database call failed!');
    }

    // Final Diagnosis
    console.log('\n🎯 FINAL DIAGNOSIS:');
    console.log('==================');
    
    if (directMovements.length > 0 && recentMovements.length === 0) {
      console.log('🔧 ISSUE: Frontend API function (adjust-stock) has a bug');
      console.log('✅ Database functions work perfectly');
      console.log('❌ Frontend API call to database fails');
    } else if (directMovements.length === 0) {
      console.log('🔧 ISSUE: Database function has a bug');
      console.log('❌ Even direct database calls fail');
    } else {
      console.log('🤔 Everything seems to work - might be a caching issue');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug test
debugAPI();