// Core Acrylics Database Fix Script - Highlander Method
// "There can be only one!"
// This script fixes the Core Acrylics products by:
// 1. Using created_at to find the newest (WINNER) of each variant
// 2. Renaming all older duplicates to z_Trash_[id] and marking inactive
// 3. Updating the WINNER with correct data
// 4. Archiving the parent product

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (prefer env vars, fall back to known project if missing)
const supabaseUrl = process.env.SUPABASE_URL || 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey =
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';

const supabase = createClient(supabaseUrl, supabaseKey);

// Define the variants to fix - exact names we want to exist
const variants = [
  { name: 'AvanéSignatureNude (071)', fullName: 'Core Acrylics - AvanéSignatureNude (071)' },
  { name: 'Barely Blooming Nude (070)', fullName: 'Core Acrylics - Barely Blooming Nude (070)' },
  { name: 'Blom Cover Pink (072)', fullName: 'Core Acrylics - Blom Cover Pink (072)' },
  { name: 'Crystal Clear (073)', fullName: 'Core Acrylics - Crystal Clear (073)' },
  { name: 'Pearl White (076)', fullName: 'Core Acrylics - Pearl White (076)' },
  { name: 'Purely White (075)', fullName: 'Core Acrylics - Purely White (075)' },
  { name: 'The Perfect Milky White (074)', fullName: 'Core Acrylics - The Perfect Milky White (074)' }
];

// Common product data for all variants
const commonProductData = {
  price: 320,
  stock: 100,
  is_active: true,
  description: '<p>All Blom Cosmetics Acrylic powders are self-leveling, non yellowing and buttery to work with.</p>',
  inci_ingredients: '',
  how_to_use: ''
};

async function fixCoreAcrylics() {
  console.log('🏴 Starting Core Acrylics Highlander Method...');
  console.log('🔪 Rule: "There can be only one!"\n');
  
  try {
    // Process each variant
    for (const variant of variants) {
      console.log(`\n🎯 Processing variant: ${variant.fullName}`);
      
      // Find ALL products that match this variant name (using ilike for partial matches)
      const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('*, created_at')
        .ilike('name', variant.fullName + '%')
        .order('created_at', { ascending: false }); // Newest first
      
      if (fetchError) {
        console.error(`❌ Error fetching products for ${variant.fullName}:`, fetchError);
        continue;
      }
      
      console.log(`🔍 Found ${existingProducts?.length || 0} products matching "${variant.fullName}"`);
      
      if (!existingProducts || existingProducts.length === 0) {
        // No products exist, create the correct one
        console.log(`🆕 No existing products found, creating WINNER...`);
        
        const { data: newProduct, error: createError } = await supabase
          .from('products')
          .insert([{
            name: variant.fullName,
            ...commonProductData
          }])
          .select();
        
        if (createError) {
          console.error(`❌ Error creating product ${variant.fullName}:`, createError);
        } else {
          console.log(`✅ Created WINNER: ${variant.fullName} with ID: ${newProduct[0].id}`);
        }
      } else {
        // Apply Highlander Method: sort by created_at (newest first), first is WINNER
        const winner = existingProducts[0];
        const losers = existingProducts.slice(1);
        
        console.log(`🏆 WINNER: Product ID ${winner.id} (created: ${winner.created_at})`);
        
        // Trash all LOSERS
        if (losers.length > 0) {
          console.log(`🗑️  Found ${losers.length} LOSER(s) to trash...`);
          
          for (const loser of losers) {
            const { error: trashError } = await supabase
              .from('products')
              .update({
                name: `z_Trash_${loser.id}`,
                is_active: false
              })
              .eq('id', loser.id);
            
            if (trashError) {
              console.error(`❌ Error trashing product ${loser.id}:`, trashError);
            } else {
              console.log(`🗑️  Trashed LOSER ${loser.id}: "${loser.name}" → "z_Trash_${loser.id}"`);
            }
          }
        }
        
        // Update the WINNER with correct data
        console.log(`🔧 Updating WINNER with correct data...`);
        
        const { error: updateError } = await supabase
          .from('products')
          .update(commonProductData)
          .eq('id', winner.id);
        
        if (updateError) {
          console.error(`❌ Error updating WINNER ${winner.id}:`, updateError);
        } else {
          console.log(`✅ Updated WINNER ${winner.id}: ${variant.fullName}`);
          console.log(`   - Price: 320`);
          console.log(`   - Stock: 100`);
          console.log(`   - Active: true`);
          console.log(`   - Description: "All Blom Cosmetics Acrylic powders..."`);
          console.log(`   - Ingredients: ""`);
          console.log(`   - How to Use: ""`);
        }
      }
    }
    
    // Archive the parent product
    console.log('\n📦 Archiving parent product...');
    const { data: parentProducts, error: parentFetchError } = await supabase
      .from('products')
      .select('*')
      .or('name.eq.Core Acrylics,name.eq.Core Acrylics [ARCHIVED]');
    
    if (parentFetchError) {
      console.error('❌ Error fetching parent products:', parentFetchError);
    } else if (parentProducts && parentProducts.length > 0) {
      for (const parentProduct of parentProducts) {
        const { error: archiveError } = await supabase
          .from('products')
          .update({ is_active: false })
          .eq('id', parentProduct.id);
        
        if (archiveError) {
          console.error(`❌ Error archiving parent product ${parentProduct.id}:`, archiveError);
        } else {
          console.log(`📦 Archived parent: ${parentProduct.name} (ID: ${parentProduct.id})`);
        }
      }
    } else {
      console.log('ℹ️ No parent product found to archive');
    }
    
    console.log('\n🎉 Core Acrylics Highlander Method completed!');
    console.log('🏴 Only the newest, strongest variants remain!');
    
  } catch (error) {
    console.error('❌ Unexpected error during Highlander Method:', error);
  }
}

// Run the fix
fixCoreAcrylics();
