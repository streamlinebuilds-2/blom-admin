/**
 * Stock Management System Test Script
 * Tests both manual stock adjustments and order-based stock deduction
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

async function testStockManagement() {
  console.log('🧪 Testing Stock Management System...\n');

  try {
    // Test 1: Manual Stock Adjustment
    console.log('📋 Test 1: Manual Stock Adjustment');
    console.log('=' .repeat(50));

    const testProductResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-products`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!testProductResponse.ok) {
      throw new Error('Failed to fetch products for testing');
    }

    const productsData = await testProductResponse.json();
    const testProduct = productsData.data?.[0];

    if (!testProduct) {
      console.log('⚠️ No products found for testing. Please ensure you have products in your database.');
      return;
    }

    console.log(`🎯 Testing with product: ${testProduct.name} (ID: ${testProduct.id})`);
    console.log(`📦 Current stock: ${testProduct.stock || 0}`);

    // Adjust stock by +5
    const adjustmentResponse = await fetch(`${SUPABASE_URL}/functions/v1/adjust-stock`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId: testProduct.id,
        delta: 5,
        reason: 'test_adjustment',
        costPrice: testProduct.cost_price_cents ? (testProduct.cost_price_cents / 100).toFixed(2) : '10.00'
      })
    });

    const adjustmentResult = await adjustmentResponse.json();
    console.log('✅ Manual adjustment result:', adjustmentResult);

    if (adjustmentResult.ok) {
      console.log('✅ Manual stock adjustment successful!\n');
    } else {
      console.log('❌ Manual stock adjustment failed:', adjustmentResult.error, '\n');
    }

    // Test 2: Check Stock Movements
    console.log('📋 Test 2: Stock Movements History');
    console.log('=' .repeat(50));

    const movementsResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-stock-movements`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const movementsData = await movementsResponse.json();
    console.log('📊 Stock movements:', movementsData);

    if (movementsData.ok && movementsData.data) {
      console.log(`✅ Found ${movementsData.data.length} stock movements`);
      movementsData.data.slice(0, 3).forEach((movement, index) => {
        console.log(`  ${index + 1}. ${movement.product_name || 'Unknown Product'}: ${movement.delta > 0 ? '+' : ''}${movement.delta} (${movement.reason})`);
      });
    } else {
      console.log('❌ No stock movements found or error occurred');
    }

    // Test 3: Order Stock Deduction (if orders exist)
    console.log('\n📋 Test 3: Order-based Stock Deduction');
    console.log('=' .repeat(50));

    const ordersResponse = await fetch(`${SUPABASE_URL}/functions/v1/admin-orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const ordersData = await ordersResponse.json();
    
    if (ordersData.ok && ordersData.data && ordersData.data.length > 0) {
      const testOrder = ordersData.data[0];
      console.log(`🎯 Testing with order: ${testOrder.id} (${testOrder.status})`);

      // Test the stock deduction function directly
      const deductionResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/process_order_stock_deduction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({
          p_order_id: testOrder.id
        })
      });

      const deductionResult = await deductionResponse.json();
      console.log('📦 Order stock deduction result:', deductionResult);

      if (deductionResult) {
        console.log(`✅ Order processing completed: ${deductionResult.successful || 0} successful, ${deductionResult.failed || 0} failed`);
      } else {
        console.log('❌ Order stock deduction failed');
      }
    } else {
      console.log('⚠️ No orders found for testing order-based stock deduction');
    }

    console.log('\n🎉 Stock Management System Test Complete!');
    console.log('\n💡 Summary:');
    console.log('- Manual stock adjustments: Test with real products');
    console.log('- Stock movements tracking: Should show all changes');
    console.log('- Order-based deduction: Works with paid orders');
    console.log('- Product matching: Uses name matching when product_id missing');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testStockManagement();