// Script to check the slugs for Glitter Acrylics products
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGlitterAcrylicsSlugs() {
  console.log('🔍 Checking slugs for Glitter Acrylics products...');
  
  try {
    // Fetch all Glitter Acrylics products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, slug, sku, is_active')
      .like('name', 'Glitter Acrylic -%')
      .eq('is_active', true);
      
    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('ℹ️ No Glitter Acrylics products found');
      return;
    }
    
    console.log(`📋 Found ${products.length} Glitter Acrylics products:`);
    console.log('================================================');
    
    // Check each product's slug
    for (const product of products) {
      console.log(`\nProduct: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Slug: ${product.slug}`);
      
      // Generate the expected slug
      const expectedSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      console.log(`Expected Slug: ${expectedSlug}`);
      
      if (product.slug !== expectedSlug) {
        console.log('⚠️ Slug mismatch!');
      } else {
        console.log('✅ Slug matches expected value');
      }
    }
    
    console.log('\n🎉 Slug check complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
checkGlitterAcrylicsSlugs();

// Export for potential use in other modules
export { checkGlitterAcrylicsSlugs };