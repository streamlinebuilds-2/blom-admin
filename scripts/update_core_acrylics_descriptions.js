// Script to update Core Acrylics products with correct descriptions
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Standard description for Core Acrylics
const standardDescription = {
  short_description: 'All Blom Cosmetics Acrylic powders are self-leveling, non yellowing and buttery to work with.',
  overview: ''
};

async function updateCoreAcrylicsDescriptions() {
  console.log('🔍 Updating Core Acrylics products with correct descriptions...');
  
  try {
    // Get all Acrylic products that need updating
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, slug, sku, is_active, short_description, overview')
      .ilike('name', '%Acrylic%')
      .neq('short_description', standardDescription.short_description)
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('ℹ️ No Acrylic products need updating');
      return;
    }
    
    console.log(`📋 Found ${products.length} Acrylic products to update:`);
    console.log('================================================');
    
    // Update each product
    for (const product of products) {
      console.log(`\nProduct: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`Current Short Description: ${product.short_description}`);
      console.log(`Current Overview: ${product.overview}`);
      
      // Update the product
      const { error: updateError } = await supabase
        .from('products')
        .update({
          short_description: standardDescription.short_description,
          overview: standardDescription.overview
        })
        .eq('id', product.id);
      
      if (updateError) {
        console.error('❌ Error updating product:', updateError.message);
      } else {
        console.log('✅ Product updated successfully');
      }
    }
    
    console.log('\n🎉 All products updated!');
    
    // Verify the updates
    const { data: verifiedProducts } = await supabase
      .from('products')
      .select('id, name, short_description, overview')
      .ilike('name', '%Acrylic%')
      .eq('is_active', true);
    
    console.log('\n📊 Verification:');
    console.log('================================================');
    for (const product of verifiedProducts) {
      console.log(`${product.name}:`);
      console.log(`  Short Description: ${product.short_description}`);
      console.log(`  Overview: ${product.overview}`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
updateCoreAcrylicsDescriptions();

// Export for potential use in other modules
export { updateCoreAcrylicsDescriptions };