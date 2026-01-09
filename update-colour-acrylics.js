#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Create Supabase client
const supabase = createClient(
  'https://yvmnedjybrpvlupygusf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI'
);

// Standard product information for Colour Acrylics
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
  console.log('🔍 Starting Colour Acrylics product update...');
  console.log('');

  try {
    // Step 1: Fetch all Colour Acrylics products that are active
    console.log('📋 Fetching Colour Acrylics products...');
    
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .like('name', 'Colour Acrylics -%')
      .eq('is_active', true);

    if (fetchError) {
      console.error(`❌ Error fetching products: ${fetchError.message}`);
      return;
    }

    if (!products || products.length === 0) {
      console.log('ℹ️ No Colour Acrylics products found or all are inactive.');
      return;
    }

    console.log(`🎯 Found ${products.length} Colour Acrylics products to update:`);
    products.forEach(product => {
      console.log(`   - ${product.name} (ID: ${product.id})`);
    });
    console.log('');

    // Step 2: Update each product
    let successCount = 0;
    let failureCount = 0;

    for (const product of products) {
      console.log(`🔄 Updating product: ${product.name} (ID: ${product.id})`);

      try {
        // First try updating with the data as-is
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
          console.warn(`⚠️  First attempt failed for product ${product.id}: ${updateError.message}`);
          
          // If the update failed, try sending how_to_use and inci_ingredients as strings
          console.log('🔁 Retrying with string conversion for array fields...');
          
          const { error: retryError } = await supabase
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

          if (retryError) {
            console.error(`❌ Failed to update product ${product.id}: ${retryError.message}`);
            failureCount++;
          } else {
            console.log(`✅ Successfully updated product ${product.id} on retry`);
            successCount++;
          }
        } else {
          console.log(`✅ Successfully updated product ${product.id}`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Unexpected error updating product ${product.id}: ${err.message}`);
        failureCount++;
      }

      console.log('');
    }

    // Step 3: Summary
    console.log('📊 Update Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} products`);
    console.log(`   ❌ Failed to update: ${failureCount} products`);
    console.log(`   📋 Total processed: ${products.length} products`);
    console.log('');

    if (failureCount > 0) {
      console.log('⚠️  Some products failed to update. Check the error messages above.');
    } else {
      console.log('🎉 All Colour Acrylics products updated successfully!');
    }

  } catch (error) {
    console.error(`❌ Fatal error: ${error.message}`);
  }
}

// Execute the update immediately
updateColourAcrylicsProducts();