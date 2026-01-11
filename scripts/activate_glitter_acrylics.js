// Script to activate Glitter Acrylic products (Funfetti and Frozen)
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function activateGlitterAcrylics() {
  console.log('🔍 Activating Glitter Acrylic products...');
  
  try {
    // Get the inactive Glitter Acrylic products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, slug, sku, is_active')
      .in('sku', ['ACR-422799', 'ACR-363488'])
      .eq('is_active', false);
    
    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('ℹ️ No inactive Glitter Acrylic products found');
      return;
    }
    
    console.log(`📋 Found ${products.length} inactive Glitter Acrylic products to activate:`);
    console.log('================================================');
    
    // Activate each product
    for (const product of products) {
      console.log(`\nProduct: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Slug: ${product.slug}`);
      console.log(`Current Status: ${product.is_active ? 'Active' : 'Inactive'}`);
      
      // Activate the product
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_active: true })
        .eq('id', product.id);
      
      if (updateError) {
        console.error('❌ Error activating product:', updateError.message);
      } else {
        console.log('✅ Product activated successfully');
      }
    }
    
    console.log('\n🎉 All products activated!');
    
    // Verify the activation
    const { data: verifiedProducts } = await supabase
      .from('products')
      .select('id, name, slug, sku, is_active')
      .in('sku', ['ACR-422799', 'ACR-363488']);
    
    console.log('\n📊 Verification:');
    console.log('================================================');
    for (const product of verifiedProducts) {
      console.log(`${product.name} (${product.slug}): ${product.is_active ? 'Active ✅' : 'Inactive ❌'}`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
activateGlitterAcrylics();

// Export for potential use in other modules
export { activateGlitterAcrylics };