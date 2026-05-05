// Script to update Colour Acrylics products using Supabase JS client
// This script fetches all Colour Acrylics products and updates them with standard information

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Standard product information for Colour Acrylics range
const standardInfo = {
  price: 150,
  stock_quantity: 100,
  track_inventory: true,
  description: `<p>Our Colour Acrylic Powder is a professional-grade polymer designed for superior adhesion, smooth application, and exceptional strength. The self-leveling formula ensures a flawless finish with minimal filing required. Available in essential shades for every nail technician.</p>
   <h3>Features & Benefits</h3>
   <ul>
       <li>Superior adhesion and longevity</li>
       <li>Self-leveling buttery consistency</li>
       <li>Non-yellowing formula</li>
       <li>Medium setting time for perfect control</li>
       <li>Bubble-free application</li>
   </ul>
   <h3>Product Details</h3>
   <ul>
       <li><strong>Size:</strong> 15g</li>
       <li><strong>Shelf Life:</strong> 24 months</li>
       <li><strong>Claims:</strong> HEMA-Free, Professional Grade, Non-Yellowing</li>
   </ul>`,
  how_to_use: `<ol>
     <li>Prep natural nail and apply primer</li>
     <li>Dip brush into monomer, then into powder</li>
     <li>Place bead onto nail and guide into place</li>
     <li>Allow to cure before filing</li>
  </ol>`,
  inci_ingredients: `<p><strong>INCI Names:</strong><br />
   Polyethylmethacrylate, Polymethyl Methacrylate, Benzoyl Peroxide, Silica</p>
   <p><strong>Key Ingredients:</strong></p>
   <ul>
       <li>Advanced Polymers – for strength and flexibility</li>
       <li>UV Inhibitors – prevents yellowing</li>
       <li>Fine grade powder – for smooth consistency</li>
   </ul>`
};

async function updateColourAcrylicsProducts() {
  console.log('🔍 Fetching Colour Acrylics products...');
  
  try {
    // 1. Fetch all Colour Acrylics products where is_active is true
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .like('name', 'Colour Acrylics -%')
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('ℹ️ No Colour Acrylics products found');
      return;
    }
    
    console.log(`📋 Found ${products.length} Colour Acrylics products to update`);
    
    // 2. Loop through each product and update with standard information
    for (const product of products) {
      console.log(`🔄 Updating product: ${product.name}`);
      
      // Try updating with the data as-is first
      const { error: updateError } = await supabase
        .from('products')
        .update({
          price: standardInfo.price,
          stock_quantity: standardInfo.stock_quantity,
          track_inventory: standardInfo.track_inventory,
          description: standardInfo.description,
          how_to_use: standardInfo.how_to_use,
          inci_ingredients: standardInfo.inci_ingredients
        })
        .eq('id', product.id);
      
      if (updateError) {
        console.warn(`⚠️  First update attempt failed for ${product.name}:`, updateError.message);
        
        // If the update fails, try sending the data as strings (in case columns are Text type)
        console.log(`🔁 Retrying with string conversion for ${product.name}...`);
        
        const stringUpdate = await supabase
          .from('products')
          .update({
            price: standardInfo.price,
            stock_quantity: standardInfo.stock_quantity,
            track_inventory: standardInfo.track_inventory,
            description: standardInfo.description,
            how_to_use: String(standardInfo.how_to_use),
            inci_ingredients: String(standardInfo.inci_ingredients)
          })
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
    
    console.log('🎉 Colour Acrylics product update complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Execute immediately when script runs
updateColourAcrylicsProducts();

// Export for potential use in other modules
export { updateColourAcrylicsProducts };