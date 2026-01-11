import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with direct credentials
const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function archiveGlitterAcrylics() {
  try {
    console.log('🔍 Starting Glitter Acrylics archiving process...');
    
    // 1. Fetch the Glitter Acrylics products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .in('name', ['Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen']);

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }

    if (!products || products.length === 0) {
      console.log('ℹ️ No Glitter Acrylics products found to archive');
      return;
    }

    console.log(`📋 Found ${products.length} Glitter Acrylics products to archive`);
    
    // 2. Archive each product by setting status to 'archived'
    for (const product of products) {
      console.log(`🔄 Archiving product: ${product.name}`);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Failed to archive ${product.name}:`, updateError.message);
      } else {
        console.log(`✅ Successfully archived ${product.name}`);
      }
    }

    console.log('🎉 Glitter Acrylics archiving complete!');

    // 3. Verify the archiving
    console.log('\n🔍 Verifying archived products...');
    const { data: verifiedProducts, error: verifyError } = await supabase
      .from('products')
      .select('id, name, slug, sku, status')
      .in('name', ['Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen']);

    if (verifyError) {
      console.error('❌ Error verifying products:', verifyError.message);
    } else {
      console.log('\n📊 Archived Products Status:');
      console.log('================================');
      verifiedProducts.forEach(product => {
        console.log(`\nProduct: ${product.name}`);
        console.log(`Slug: ${product.slug}`);
        console.log(`SKU: ${product.sku}`);
        console.log(`Status: ${product.status}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

archiveGlitterAcrylics();