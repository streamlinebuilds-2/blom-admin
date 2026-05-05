// Script to update Glitter Acrylics products using Supabase JS client
// This script fetches all Glitter Acrylics products and updates them with standard information

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Specific Glitter Acrylic variations with their SKUs
const glitterVariants = [
  {
    name: 'Glitter Acrylic - Mienks',
    sku: 'ACR-445220',
    description: 'Opalescent crushed-ice acrylic blend with prismatic shimmer.'
  },
  {
    name: 'Glitter Acrylic - Funfetti',
    sku: 'ACR-163655',
    description: 'Colorful confetti-style glitter acrylic with multi-colored sparkles.'
  },
  {
    name: 'Glitter Acrylic - Frozen',
    sku: 'ACR-', // SKU not provided, will keep existing or generate
    description: 'Icy blue and silver glitter acrylic with frosted finish.'
  }
];

// Standard product information for Glitter Acrylics range
const standardInfo = {
  price: 150,
  stock_quantity: 100,
  track_inventory: true,
  description: `Our Glitter Acrylic Powder is a professional-grade polymer infused with sparkling glitter particles for a dazzling finish. Designed for superior adhesion, smooth application, and exceptional strength. The self-leveling formula ensures a flawless finish with minimal filing required. Available in stunning glitter variations for every nail technician.`,
  how_to_use: `1. Prep natural nail and apply primer
2. Dip brush into monomer, then into powder
3. Place bead onto nail and guide into place
4. Allow to cure before filing`,
  inci_ingredients: `Polyethylmethacrylate, Polymethyl Methacrylate, Benzoyl Peroxide, Silica, Polyester-11 (Glitter)`
};

async function updateGlitterAcrylicsProducts() {
  console.log('🔍 Fetching Glitter Acrylics products...');
  
  try {
    // 1. Fetch all Glitter Acrylics products where is_active is true
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
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
    
    console.log(`📋 Found ${products.length} Glitter Acrylics products to update`);
    
    // 2. Loop through each product and update with standard information
    for (const product of products) {
      console.log(`🔄 Updating product: ${product.name}`);
      
      // Find the specific variant info for this product
      const variantInfo = glitterVariants.find(v => product.name.includes(v.name));
      
      // Prepare the update data
      const updateData = {
        price: standardInfo.price,
        stock_quantity: standardInfo.stock_quantity,
        track_inventory: standardInfo.track_inventory,
        how_to_use: standardInfo.how_to_use,
        inci_ingredients: standardInfo.inci_ingredients
      };
      
      // Add variant-specific description if found
      if (variantInfo) {
        updateData.description = variantInfo.description;
        
        // Update SKU if provided and different from current
        if (variantInfo.sku && variantInfo.sku !== 'ACR-' && variantInfo.sku !== product.sku) {
          updateData.sku = variantInfo.sku;
        }
      } else {
        updateData.description = standardInfo.description;
      }
      
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
          ...updateData,
          how_to_use: String(updateData.how_to_use),
          inci_ingredients: String(updateData.inci_ingredients)
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
    
    console.log('🎉 Glitter Acrylics product update complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
updateGlitterAcrylicsProducts();

// Export for potential use in other modules
export { updateGlitterAcrylicsProducts };