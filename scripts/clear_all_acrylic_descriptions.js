// Script to clear all description fields for Acrylic products
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllAcrylicDescriptions() {
  console.log('🔍 Clearing all description fields for Acrylic products...');
  
  try {
    // Get all Acrylic products that have non-empty description fields
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('id, name, description')
      .ilike('name', '%Acrylic%')
      .not('description', 'is', null)
      .neq('description', '')
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('ℹ️ No Acrylic products need description clearing');
      return;
    }
    
    console.log(`📋 Found ${products.length} Acrylic products to clear descriptions:`);
    console.log('================================================');
    
    // Clear descriptions for each product
    for (const product of products) {
      console.log(`\nProduct: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`Current Description: ${product.description.substring(0, 50)}...`);
      
      // Clear the description
      const { error: updateError } = await supabase
        .from('products')
        .update({
          description: '',
          long_description: '',
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);
      
      if (updateError) {
        console.error('❌ Error clearing description:', updateError.message);
      } else {
        console.log('✅ Description cleared successfully');
      }
    }
    
    console.log('\n🎉 All descriptions cleared!');
    
    // Verify the updates
    const { data: verifiedProducts } = await supabase
      .from('products')
      .select('id, name, description')
      .ilike('name', '%Acrylic%')
      .eq('is_active', true);
    
    console.log('\n📊 Verification:');
    console.log('================================================');
    let count = 0;
    for (const product of verifiedProducts) {
      if (product.description && product.description.trim() !== '') {
        console.log(`${product.name}: Description still present`);
        count++;
      }
    }
    if (count === 0) {
      console.log('All Acrylic products now have empty descriptions!');
    } else {
      console.log(`${count} products still have descriptions`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
clearAllAcrylicDescriptions();

// Export for potential use in other modules
export { clearAllAcrylicDescriptions };