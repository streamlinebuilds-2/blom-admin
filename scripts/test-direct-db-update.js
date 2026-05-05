import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yvmnedjybrpvlupygusf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI'
);

async function testDirectDatabaseUpdate() {
  const orderId = '9f9e0f93-e380-4756-ae78-ff08a22cc7c9';
  
  console.log('🧪 Testing Direct Database Status Update...');
  console.log('Order ID:', orderId);
  
  try {
    // 1. Check current status
    console.log('\n1. CHECKING CURRENT STATUS...');
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, fulfillment_type, order_packed_at')
      .eq('id', orderId)
      .single();
    
    if (fetchError || !currentOrder) {
      console.error('❌ Error fetching order:', fetchError);
      return;
    }
    
    console.log('📋 Current status:', currentOrder.status);
    console.log('📋 Fulfillment type:', currentOrder.fulfillment_type);
    console.log('📅 Packed at:', currentOrder.order_packed_at);
    
    // 2. Try direct database update
    console.log('\n2. ATTEMPTING DIRECT DATABASE UPDATE...');
    const now = new Date().toISOString();
    
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'packed',
        order_packed_at: now,
        updated_at: now
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }
    
    console.log('✅ Update successful!');
    console.log('📋 New status:', updatedOrder.status);
    console.log('📅 New packed at:', updatedOrder.order_packed_at);
    
    // 3. Verify update persisted
    console.log('\n3. VERIFYING UPDATE PERSISTED...');
    const { data: verifyOrder, error: verifyError } = await supabase
      .from('orders')
      .select('id, status, order_packed_at')
      .eq('id', orderId)
      .single();
    
    if (verifyError || !verifyOrder) {
      console.error('❌ Verification failed:', verifyError);
      return;
    }
    
    console.log('📋 Persisted status:', verifyOrder.status);
    console.log('📅 Persisted packed at:', verifyOrder.order_packed_at);
    
    if (verifyOrder.status === 'packed') {
      console.log('🎉 SUCCESS: Database update works!');
      console.log('💡 Issue is likely in the API deployment or endpoint');
    } else {
      console.log('❌ FAILED: Database update did not persist');
    }
    
  } catch (err) {
    console.error('💥 Test failed:', err.message);
  }
}

testDirectDatabaseUpdate();