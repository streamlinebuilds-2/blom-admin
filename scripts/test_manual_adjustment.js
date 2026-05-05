/**
 * Test Manual Stock Adjustment
 * This script tests the manual adjustment process to debug stock movement logging
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

async function testManualStockAdjustment() {
  console.log('🔧 Testing Manual Stock Adjustment Process...\n');

  try {
    // Step 1: Get a product for testing
    console.log('📋 Step 1: Fetching a test product...');
    const productsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!productsResponse.ok) {
      throw new Error('Failed to fetch products');
    }

    const productsData = await productsResponse.json();
    const testProduct = productsData.data?.[0];

    if (!testProduct) {
      throw new Error('No products found for testing');
    }

    console.log(`🎯 Testing with product: ${testProduct.name} (ID: ${testProduct.id})`);
    console.log(`📦 Current stock: ${testProduct.stock || 0}`);

    // Step 2: Make a manual stock adjustment
    console.log('\n📋 Step 2: Making manual stock adjustment...');
    const adjustmentData = {
      productId: testProduct.id,
      delta: 5, // Add 5 units
      reason: 'test_adjustment'
    };

    console.log('📤 Adjustment request:', adjustmentData);

    const adjustmentResponse = await fetch(`${SUPABASE_URL}/functions/v1/adjust-stock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adjustmentData)
    });

    const adjustmentResult = await adjustmentResponse.json();
    console.log('✅ Adjustment response:', adjustmentResult);

    // Step 3: Check stock movements
    console.log('\n📋 Step 3: Checking stock movements...');
    const movementsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-stock-movements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const movementsData = await movementsResponse.json();
    console.log('📊 Stock movements response:', movementsData);

    if (movementsData.ok && movementsData.data) {
      console.log(`\n✅ Found ${movementsData.data.length} stock movements`);
      
      // Show recent movements
      const recentMovements = movementsData.data.slice(0, 5);
      recentMovements.forEach((movement, index) => {
        const change = movement.delta > 0 ? '+' : '';
        console.log(`  ${index + 1}. ${movement.product_name || 'Unknown'}: ${change}${movement.delta} (${movement.reason})`);
      });

      // Check if our test adjustment is there
      const testMovement = movementsData.data.find(m => 
        m.product_id === testProduct.id && 
        m.delta === 5 && 
        m.reason?.includes('test_adjustment')
      );

      if (testMovement) {
        console.log('\n✅ SUCCESS: Test stock movement was created correctly!');
      } else {
        console.log('\n❌ ERROR: Test stock movement was NOT created!');
      }
    } else {
      console.log('\n❌ ERROR: Failed to fetch stock movements or no data returned');
    }

    // Step 4: Check product stock again
    console.log('\n📋 Step 4: Verifying product stock updated...');
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
      const newStock = refreshedProduct.stock || 0;
      const expectedStock = (testProduct.stock || 0) + 5;
      
      if (newStock === expectedStock) {
        console.log(`✅ SUCCESS: Stock updated correctly (${testProduct.stock || 0} → ${newStock})`);
      } else {
        console.log(`❌ ERROR: Stock not updated correctly (expected ${expectedStock}, got ${newStock})`);
      }
    } else {
      console.log('❌ ERROR: Could not find updated product');
    }

    console.log('\n🎉 Manual stock adjustment test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testManualStockAdjustment();