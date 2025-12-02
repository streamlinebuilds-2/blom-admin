// verify_stock_fix.js
import { createClient } from '@supabase/supabase-js';

// REPLACE THESE WITH YOUR ACTUAL CREDENTIALS
const SUPABASE_URL = 'https://yvmnedjybrpvlupygusf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI'; 

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testSystem() {
  console.log('🔍 Starting Stock System Verification...\n');

  // 1. Get a test product
  const { data: products, error: productsError } = await supabase.from('products').select('id, name, stock').limit(1);
  if (productsError) {
    console.error('❌ Error fetching products:', productsError);
    return;
  }
  if (!products || products.length === 0) {
    console.error('❌ No products found to test with.');
    return;
  }
  const product = products[0];
  console.log(`📦 Test Product: ${product.name} (Stock: ${product.stock})`);

  // 2. Test Manual Adjustment (RPC)
  console.log('\n👉 Testing Manual Adjustment RPC...');
  const { error: rpcError } = await supabase.rpc('adjust_stock', {
    product_uuid: product.id,
    quantity_to_reduce: 1 // Reducing by 1
  });

  if (rpcError) console.error('❌ adjust_stock RPC failed:', rpcError);
  else console.log('✅ adjust_stock RPC success');

  // 3. Test Logging (RPC)
  console.log('\n👉 Testing Logging RPC...');
  const { error: logError } = await supabase.rpc('log_stock_movement', {
    p_product_id: product.id,
    p_delta: -1,
    p_reason: 'Test Script',
    p_movement_type: 'test'
  });

  if (logError) console.error('❌ log_stock_movement RPC failed:', logError);
  else console.log('✅ log_stock_movement RPC success');

  // 4. Verify Results
  console.log('\n👉 Verifying Database Changes...');
  
  const { data: newProduct, error: refreshError } = await supabase.from('products').select('stock').eq('id', product.id).single();
  if (refreshError) {
    console.error('❌ Error refreshing product:', refreshError);
    return;
  }
  console.log(`   Old Stock: ${product.stock} -> New Stock: ${newProduct.stock}`);
  
  if (newProduct.stock === product.stock - 2) console.log('✅ Stock deducted correctly! (-2 total)');
  else console.log(`❌ Stock did NOT change as expected. Expected: ${product.stock - 2}, Got: ${newProduct.stock}`);

  const { data: logs, error: logsError } = await supabase.from('stock_movements').select('*').eq('product_id', product.id).order('created_at', { ascending: false }).limit(3);
  
  if (logsError) {
    console.error('❌ Error fetching stock movements:', logsError);
    return;
  }
  
  if (logs && logs.length > 0) {
    console.log('✅ Recent stock movements found:');
    logs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.movement_type}: ${log.reason} (${log.delta > 0 ? '+' : ''}${log.delta}) - ${log.created_at}`);
    });
  } else {
    console.error('❌ No movement logs created.');
  }

  // 5. Test Product Matching Function
  console.log('\n👉 Testing Product Matching Function...');
  const { data: matchResult, error: matchError } = await supabase.rpc('find_product_match', {
    order_product_name: product.name
  });

  if (matchError) {
    console.error('❌ find_product_match RPC failed:', matchError);
  } else {
    console.log('✅ find_product_match RPC success');
    console.log('   Result:', matchResult);
  }

  console.log('\n🔍 Verification Complete!');
}

testSystem().catch(console.error);