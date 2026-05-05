// Script to update Core Acrylics products' overview field using Supabase JS client
// This script fetches all Core Acrylics products and updates their overview field

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCoreAcrylicsOverview() {
  console.log('🔍 Fetching Core Acrylics products...');
  
  try {
    // 1. Fetch all Core Acrylics products where is_active is true
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .like('name', 'Core Acrylics -%')
      .eq('is_active', true);
      
    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('ℹ️ No Core Acrylics products found');
      return;
    }
    
    console.log(`📋 Found ${products.length} Core Acrylics products to update`);
    
    // 2. Loop through each product and update the overview field
    for (const product of products) {
      console.log(`🔄 Updating product: ${product.name}`);
      
      // Prepare the update data
      const updateData = {
        overview: product.short_description || '' // Set overview to short_description or empty string
      };
      
      // Try updating with the data as-is first
      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id);
      
      if (updateError) {
        console.warn(`⚠️  First update attempt failed for ${product.name}:`, updateError.message);
        
        // If the update fails, try sending the data as strings (in case columns are Text type)
        console.log(`🔁 Retrying with string conversion for ${product.name}...`);
        
        const stringUpdateData = {
          overview: String(product.short_description || '')
        };
        
        const stringUpdate = await supabase
          .from('products')
          .update(stringUpdateData)
          .eq('id', product.id);
        
        if (stringUpdate.error) {
          console.error(`❌ Failed to update ${product.name}:`, stringUpdate.error.message);
        } else {
          console.log(`✅ Successfully updated ${product.name} (with string conversion)`);
        }
      } else {
        console.log(`✅ Successfully updated ${product.name}`);
      }
    }
    
    console.log('🎉 Core Acrylics overview update complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
updateCoreAcrylicsOverview();

// Export for potential use in other modules
export { updateCoreAcrylicsOverview };