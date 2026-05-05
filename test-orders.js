import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yvmnedjybrpvlupygusf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI' // Using service role key from .env
);

async function testOrders() {
  console.log('Testing database connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('orders').select('count').limit(1);
    if (error) {
      console.error('Database connection error:', error);
      return;
    }
    
    console.log('✅ Database connected successfully');
    
    // Get all orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, buyer_name, created_at, total_cents')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return;
    }
    
    console.log(`\n📊 Found ${orders.length} orders:`);
    orders.forEach(order => {
      console.log(`- ${order.id}: ${order.status} - ${order.buyer_name} - R${(order.total_cents/100).toFixed(2)}`);
    });
    
    if (orders.length === 0) {
      console.log('\n⚠️  No orders found in database!');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testOrders();