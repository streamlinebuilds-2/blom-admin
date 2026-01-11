import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGlitterAcrylicsStatus() {
  try {
    // Query for the specific glitter acrylic products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .in('slug', ['glitter-acrylic-funfetti', 'glitter-acrylic-frozen', 'glitter-acrylic-mienks'])
      .order('slug');

    if (error) {
      console.error('Error fetching products:', error);
      return;
    }

    if (!products || products.length === 0) {
      console.log('No products found with the specified slugs');
      return;
    }

    console.log('Glitter Acrylic Products Status:');
    console.log('================================');
    
    products.forEach(product => {
      console.log(`\nProduct: ${product.name}`);
      console.log(`Slug: ${product.slug}`);
      console.log(`SKU: ${product.sku}`);
      console.log(`Status: ${product.status}`);
      console.log(`Visibility: ${product.visibility}`);
      console.log(`Stock: ${product.stock}`);
      console.log(`Price: R ${product.price}`);
      console.log(`Active: ${product.active}`);
      console.log(`Archived: ${product.archived}`);
    });

  } catch (err) {
    console.error('Error in checkGlitterAcrylicsStatus:', err);
  }
}

checkGlitterAcrylicsStatus();