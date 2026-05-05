// Script to add missing Glitter Acrylic products (Funfetti and Frozen)
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

// Standard product information for Glitter Acrylics range
const standardInfo = {
  price: 150,
  stock_quantity: 100,
  track_inventory: true,
  category: 'Acrylic System',
  description: `Our Glitter Acrylic Powder is a professional-grade polymer infused with sparkling glitter particles for a dazzling finish. Designed for superior adhesion, smooth application, and exceptional strength. The self-leveling formula ensures a flawless finish with minimal filing required. Available in stunning glitter variations for every nail technician.`,
  how_to_use: `1. Prep natural nail and apply primer
2. Dip brush into monomer, then into powder
3. Place bead onto nail and guide into place
4. Allow to cure before filing`,
  inci_ingredients: `Polyethylmethacrylate, Polymethyl Methacrylate, Benzoyl Peroxide, Silica, Polyester-11 (Glitter)`,
  is_active: true
};

// Missing Glitter Acrylic products to add
const missingProducts = [
  {
    name: 'Glitter Acrylic - Funfetti',
    sku: 'ACR-422799',
    description: 'Colorful confetti-style glitter acrylic with multi-colored sparkles.',
    slug: 'glitter-acrylic-funfetti'
  },
  {
    name: 'Glitter Acrylic - Frozen',
    sku: 'ACR-363488',
    description: 'Icy blue and silver glitter acrylic with frosted finish.',
    slug: 'glitter-acrylic-frozen'
  }
];

async function addMissingGlitterAcrylics() {
  console.log('🔍 Adding missing Glitter Acrylic products...');
  
  try {
    for (const product of missingProducts) {
      console.log(`\n📋 Adding product: ${product.name}`);
      
      // Prepare the product data
      const productData = {
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        price: standardInfo.price,
        stock_quantity: standardInfo.stock_quantity,
        track_inventory: standardInfo.track_inventory,
        category: standardInfo.category,
        description: product.description || standardInfo.description,
        how_to_use: standardInfo.how_to_use,
        inci_ingredients: standardInfo.inci_ingredients,
        is_active: standardInfo.is_active
      };
      
      console.log('Product data:', productData);
      
      // Insert the product into the database
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select();
      
      if (error) {
        console.error('❌ Error adding product:', error.message);
      } else {
        console.log('✅ Product added successfully:', data);
      }
    }
    
    console.log('\n🎉 All missing products added!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
addMissingGlitterAcrylics();

// Export for potential use in other modules
export { addMissingGlitterAcrylics };