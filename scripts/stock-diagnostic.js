#!/usr/bin/env node

/**
 * Stock Management Diagnostic Script
 * Runs all diagnostic queries from CURSOR_DATABASE_DEBUG_PROMPT.md
 * 
 * This script requires the 'pg' package for direct PostgreSQL access.
 * Install it with: npm install pg
 * 
 * Or use environment variables:
 * - DATABASE_URL: PostgreSQL connection string
 * - Or SUPABASE_DB_PASSWORD: Password for direct connection
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yvmnedjybrpvlupygusf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(step, message, data = null) {
  console.log(`${colors.cyan}${step}${colors.reset} ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function success(message) {
  console.log(`${colors.green}✅${colors.reset} ${message}`);
}

function error(message) {
  console.log(`${colors.red}❌${colors.reset} ${message}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠️${colors.reset} ${message}`);
}

// Step 1: Check Current Database State
async function step1_checkDatabaseState() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}STEP 1: Check Current Database State${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  try {
    // Check stock_movements table structure via Supabase client
    log('📋', 'Checking stock_movements table...');
    
    const { data: movements, error: movError } = await admin
      .from('stock_movements')
      .select('*')
      .limit(1);

    if (movError) {
      if (movError.message.includes('relation') || movError.message.includes('does not exist')) {
        error('stock_movements table does not exist!');
        warning('You may need to run the create_stock_movements_table.sql migration first.');
      } else {
        error(`Error accessing stock_movements: ${movError.message}`);
      }
    } else {
      success('stock_movements table exists and is accessible');
      
      // Get count
      const { count } = await admin
        .from('stock_movements')
        .select('*', { count: 'exact', head: true });
      
      log('📊', `Total stock movements: ${count || 0}`);
    }

    // Check if functions exist - this requires raw SQL, so we'll try via RPC or note it
    log('🔍', 'Checking for database functions...');
    warning('Function existence check requires raw SQL. See Step 2 for function creation.');

    return { movementsExist: !movError, movementCount: movements?.length || 0 };
  } catch (err) {
    error(`Step 1 failed: ${err.message}`);
    return { error: err.message };
  }
}

// Step 2: Clean Up & Reset Functions
async function step2_cleanupFunctions() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}STEP 2: Clean Up & Reset Functions${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  warning('This step requires raw SQL execution.');
  warning('Please run the SQL from Step 2 in the Supabase SQL Editor:');
  console.log(`
-- Drop existing functions
DROP FUNCTION IF EXISTS log_stock_movement(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS process_order_stock_deduction(uuid) CASCADE;
DROP FUNCTION IF EXISTS adjust_stock(uuid, int) CASCADE;

-- Create minimal working versions
CREATE OR REPLACE FUNCTION log_stock_movement(
  p_product_id uuid,
  p_delta integer,
  p_reason text
) RETURNS void AS $$
BEGIN
  INSERT INTO stock_movements (
    product_id,
    delta,
    reason,
    created_at
  ) VALUES (
    p_product_id,
    p_delta,
    p_reason,
    now()
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION adjust_stock(product_uuid uuid, quantity_to_reduce int)
RETURNS void AS $$
BEGIN
  UPDATE products SET stock = stock - quantity_to_reduce WHERE id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_stock_movement(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION adjust_stock(uuid, int) TO service_role;
  `);

  return { requiresManualStep: true };
}

// Step 3: Test Functions Manually
async function step3_testFunctions() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}STEP 3: Test Functions Manually${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  try {
    // Get a test product
    log('🔍', 'Finding a test product...');
    const { data: products, error: prodError } = await admin
      .from('products')
      .select('id, name, stock')
      .limit(1);

    if (prodError || !products || products.length === 0) {
      error('No products found to test with');
      return { error: 'No products available' };
    }

    const testProduct = products[0];
    success(`Found test product: ${testProduct.name} (ID: ${testProduct.id}, Stock: ${testProduct.stock})`);

    log('🧪', 'Testing log_stock_movement function...');
    warning('To test the function, run this SQL in Supabase SQL Editor:');
    console.log(`
SELECT log_stock_movement(
  '${testProduct.id}'::uuid, 
  5, 
  'Test manual adjustment'
);

-- Then check if the movement was created:
SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 1;
    `);

    // Check recent movements
    const { data: recentMovements } = await admin
      .from('stock_movements')
      .select('*, products(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentMovements && recentMovements.length > 0) {
      success(`Found ${recentMovements.length} recent stock movements`);
      log('📋', 'Recent movements:', recentMovements);
    } else {
      warning('No stock movements found yet');
    }

    return { testProduct, recentMovements };
  } catch (err) {
    error(`Step 3 failed: ${err.message}`);
    return { error: err.message };
  }
}

// Step 4: Check Frontend API Calls
async function step4_checkFrontendAPI() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}STEP 4: Check Frontend API Calls${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  try {
    log('📊', 'Checking recent stock movements with product names...');
    
    const { data: movements, error: movError } = await admin
      .from('stock_movements')
      .select(`
        id,
        product_id,
        delta,
        reason,
        created_at,
        products!inner(name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (movError) {
      error(`Error fetching movements: ${movError.message}`);
      return { error: movError.message };
    }

    if (movements && movements.length > 0) {
      success(`Found ${movements.length} recent stock movements`);
      movements.forEach((mov, idx) => {
        console.log(`  ${idx + 1}. ${mov.products?.name || 'Unknown'} - Delta: ${mov.delta}, Reason: ${mov.reason}`);
      });
    } else {
      warning('No stock movements found');
    }

    return { movements };
  } catch (err) {
    error(`Step 4 failed: ${err.message}`);
    return { error: err.message };
  }
}

// Step 5: Debug Order Processing
async function step5_debugOrderProcessing() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}STEP 5: Debug Order Processing${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  try {
    log('🔍', 'Checking paid orders...');
    
    const { data: paidOrders, error: orderError } = await admin
      .from('orders')
      .select(`
        id,
        status,
        created_at,
        order_items(count)
      `)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orderError) {
      error(`Error fetching orders: ${orderError.message}`);
    } else if (paidOrders && paidOrders.length > 0) {
      success(`Found ${paidOrders.length} paid orders`);
      paidOrders.forEach((order, idx) => {
        console.log(`  ${idx + 1}. Order ${order.id} - ${order.order_items?.length || 0} items`);
      });
    } else {
      warning('No paid orders found');
    }

    log('🔍', 'Checking order items with missing product_ids...');
    const { data: itemsWithoutProduct, error: itemsError } = await admin
      .from('order_items')
      .select('order_id, name, product_id, quantity')
      .is('product_id', null)
      .limit(5);

    if (itemsError) {
      error(`Error fetching order items: ${itemsError.message}`);
    } else if (itemsWithoutProduct && itemsWithoutProduct.length > 0) {
      warning(`Found ${itemsWithoutProduct.length} order items without product_id`);
      itemsWithoutProduct.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.name} (Order: ${item.order_id}) - Qty: ${item.quantity}`);
      });
    } else {
      success('All order items have product_id');
    }

    return { paidOrders, itemsWithoutProduct };
  } catch (err) {
    error(`Step 5 failed: ${err.message}`);
    return { error: err.message };
  }
}

// Step 6: Create Order Deduction Function
async function step6_createOrderDeductionFunction() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}STEP 6: Create Order Deduction Function${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  warning('This step requires raw SQL execution.');
  warning('Please run the SQL from Step 6 in the Supabase SQL Editor:');
  console.log(`
-- Simple order processing function
CREATE OR REPLACE FUNCTION process_order_stock_deduction(p_order_id uuid)
RETURNS json AS $$
DECLARE
  item RECORD;
  product_found uuid;
  stock_before integer;
  stock_after integer;
  results json := '[]'::json;
  success_count integer := 0;
  fail_count integer := 0;
BEGIN
  FOR item IN
    SELECT oi.id, oi.product_id, oi.name, oi.quantity
    FROM order_items oi 
    WHERE oi.order_id = p_order_id
  LOOP
    BEGIN
      product_found := item.product_id;
      
      -- If no product_id, try to find by name
      IF product_found IS NULL THEN
        SELECT p.id INTO product_found
        FROM products p 
        WHERE LOWER(p.name) = LOWER(item.name)
        LIMIT 1;
      END IF;
      
      -- If still no match, skip this item
      IF product_found IS NULL THEN
        results := results || json_build_object('item_id', item.id, 'status', 'failed', 'error', 'Product not found')::json;
        fail_count := fail_count + 1;
        CONTINUE;
      END IF;
      
      -- Get current stock and deduct
      SELECT p.stock INTO stock_before FROM products p WHERE p.id = product_found;
      stock_after := stock_before - item.quantity;
      
      UPDATE products SET stock = stock_after WHERE id = product_found;
      
      -- Log the movement
      PERFORM log_stock_movement(product_found, -item.quantity, 'Order deduction: ' || item.name);
      
      results := results || json_build_object('item_id', item.id, 'status', 'success', 'product_id', product_found)::json;
      success_count := success_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      results := results || json_build_object('item_id', item.id, 'status', 'failed', 'error', SQLERRM)::json;
      fail_count := fail_count + 1;
    END;
  END LOOP;
  
  RETURN json_build_object('successful', success_count, 'failed', fail_count, 'results', results);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION process_order_stock_deduction(uuid) TO service_role;
  `);

  return { requiresManualStep: true };
}

// Step 7: Final Test
async function step7_finalTest() {
  console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}STEP 7: Final Test${colors.reset}`);
  console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

  try {
    log('📊', 'Checking final state...');
    
    // Get recent movements
    const { data: recentMovements } = await admin
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentMovements && recentMovements.length > 0) {
      success(`Found ${recentMovements.length} recent stock movements`);
    }

    // Get products with recent movements
    if (recentMovements && recentMovements.length > 0) {
      const productIds = [...new Set(recentMovements.map(m => m.product_id))];
      
      const { data: products } = await admin
        .from('products')
        .select('id, name, stock')
        .in('id', productIds);

      if (products && products.length > 0) {
        success(`Products with recent stock movements:`);
        products.forEach(p => {
          console.log(`  • ${p.name} - Stock: ${p.stock}`);
        });
      }
    }

    warning('To test order processing, run this SQL in Supabase SQL Editor:');
    console.log(`
-- Replace YOUR_ORDER_ID with an actual order ID
SELECT process_order_stock_deduction('YOUR_ORDER_ID'::uuid);

-- Check results
SELECT * FROM stock_movements ORDER BY created_at DESC LIMIT 10;
    `);

    return { recentMovements };
  } catch (err) {
    error(`Step 7 failed: ${err.message}`);
    return { error: err.message };
  }
}

// Main execution
async function runDiagnostics() {
  console.log(`\n${colors.bright}${colors.blue}`);
  console.log('🔍 STOCK MANAGEMENT DIAGNOSTIC TOOL');
  console.log('='.repeat(60));
  console.log(`${colors.reset}\n`);

  const results = {};

  try {
    results.step1 = await step1_checkDatabaseState();
    results.step2 = await step2_cleanupFunctions();
    results.step3 = await step3_testFunctions();
    results.step4 = await step4_checkFrontendAPI();
    results.step5 = await step5_debugOrderProcessing();
    results.step6 = await step6_createOrderDeductionFunction();
    results.step7 = await step7_finalTest();

    console.log(`\n${colors.bright}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}DIAGNOSTIC COMPLETE${colors.reset}`);
    console.log(`${colors.bright}${'='.repeat(60)}${colors.reset}\n`);

    console.log('\n📋 Summary:');
    console.log('  • Steps 2 and 6 require manual SQL execution in Supabase Dashboard');
    console.log('  • All other steps have been checked via API');
    console.log('\n💡 Next Steps:');
    console.log('  1. Run the SQL from Steps 2 and 6 in Supabase SQL Editor');
    console.log('  2. Test the functions using the SQL provided in Steps 3 and 7');
    console.log('  3. Verify stock movements are being created correctly');

  } catch (err) {
    error(`Diagnostic failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run if called directly
runDiagnostics().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});

export { runDiagnostics };

