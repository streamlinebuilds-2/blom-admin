const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkProducts() {
  try {
    // Check products with different filters
    const { data: byStatus, error: error1 } = await supabase
      .from('products')
      .select('id, name, sku, status, is_active, stock, category')
      .eq('status', 'active')
      .order('name');

    const { data: byActive, error: error2 } = await supabase
      .from('products')
      .select('id, name, sku, status, is_active, stock, category')
      .eq('is_active', true)
      .order('name');

    if (error1) console.log('Error by status:', error1.message);
    if (error2) console.log('Error by active:', error2.message);

    console.log('=== Products by status=active ===');
    console.log(`Found ${byStatus?.length || 0} products`);
    byStatus?.forEach(p => {
      console.log(`${p.name} | SKU: ${p.sku} | Status: ${p.status} | Active: ${p.is_active} | Stock: ${p.stock}`);
    });

    console.log('\n=== Products by is_active=true ===');
    console.log(`Found ${byActive?.length || 0} products`);
    byActive?.forEach(p => {
      console.log(`${p.name} | SKU: ${p.sku} | Status: ${p.status} | Active: ${p.is_active} | Stock: ${p.stock}`);
    });

  } catch (e) {
    console.log('Exception:', e.message);
  }
}

checkProducts();