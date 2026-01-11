// Script to update the slugs for Glitter Acrylics products
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateGlitterAcrylicsSlugs() {
  console.log('🔍 Updating slugs for Glitter Acrylics products...');
  
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
    
    console.log(`📋 Found ${products.length} Glitter Acrylics products to update:`);
    console.log('================================================');
    
    // Update each product's slug if necessary
    for (const product of products) {
      console.log(`\nProduct: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Current Slug: ${product.slug}`);
      
      // Generate the expected slug
      const expectedSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      console.log(`Expected Slug: ${expectedSlug}`);
      
      if (product.slug !== expectedSlug) {
        console.log('⚠️ Slug mismatch! Updating...');
        
        // Update the slug
        const { error: updateError } = await supabase
          .from('products')
          .update({ slug: expectedSlug })
          .eq('id', product.id);
        
        if (updateError) {
          console.error('❌ Error updating slug:', updateError.message);
        } else {
          console.log('✅ Slug updated successfully');
        }
      } else {
        console.log('✅ Slug is already correct');
      }
    }
    
    console.log('\n🎉 Slug update complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
updateGlitterAcrylicsSlugs();

// Export for potential use in other modules
export { updateGlitterAcrylicsSlugs };