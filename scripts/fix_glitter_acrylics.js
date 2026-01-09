// Glitter Acrylic Product Fix Script
// This script cleans up and standardizes Glitter Acrylic products

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Glitter Acrylic variants to process with their specific descriptions
const variants = [
  {
    name: 'Frozen',
    description: 'Icy blue and silver glitter acrylic with frosted finish.'
  },
  {
    name: 'Funfetti',
    description: 'Colorful confetti-style glitter acrylic with multi-colored sparkles.'
  },
  {
    name: 'Mienks',
    description: 'Opalescent crushed-ice acrylic blend with prismatic shimmer.'
  }
];

// Standard product information
const standardInfo = {
  price: 150,
  stock_quantity: 100,
  is_active: true,
  description: 'Our Glitter Acrylic Powder is a professional-grade polymer infused with sparkling glitter particles for a dazzling finish. Designed for superior adhesion, smooth application, and exceptional strength. The self-leveling formula ensures a flawless finish with minimal filing required. Available in stunning glitter variations for every nail technician.',
  inci_ingredients: 'Polyethylmethacrylate, Polymethyl Methacrylate, Benzoyl Peroxide, Silica, Polyester-11 (Glitter)',
  how_to_use: '1. Prep natural nail and apply primer\n2. Dip brush into monomer, then into powder\n3. Place bead onto nail and guide into place\n4. Allow to cure before filing'
};

async function fixGlitterAcrylics() {
  console.log('Starting Glitter Acrylic product cleanup...');
  
  for (const variant of variants) {
    const productName = `Glitter Acrylic - ${variant.name}`;
    console.log(`\nProcessing variant: ${productName}`);
    
    try {
      // Fetch all products matching this variant name
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .ilike('name', productName + '%')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error(`Error fetching products for ${productName}:`, fetchError.message);
        continue;
      }
      
      if (!products || products.length === 0) {
        console.log(`No products found for ${productName}`);
        continue;
      }
      
      console.log(`Found ${products.length} products for ${productName}`);
      
      // Process duplicates: first is winner, rest are losers
      const winner = products[0];
      const losers = products.slice(1);
      
      // Update winner with standard information and variant-specific description
      const { error: winnerError } = await supabase
        .from('products')
        .update({
          price: standardInfo.price,
          stock_quantity: standardInfo.stock_quantity,
          is_active: standardInfo.is_active,
          description: variant.description,  // Use variant-specific description
          inci_ingredients: standardInfo.inci_ingredients,
          how_to_use: standardInfo.how_to_use,
          updated_at: new Date().toISOString()
        })
        .eq('id', winner.id);
      
      if (winnerError) {
        console.error(`Error updating winner product ${winner.id}:`, winnerError.message);
      } else {
        console.log(`✅ Updated winner product ${winner.id}: ${winner.name}`);
      }
      
      // Archive losers
      for (const loser of losers) {
        const { error: loserError } = await supabase
          .from('products')
          .update({
            is_active: false,
            name: `z_Trash_${loser.id}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', loser.id);
        
        if (loserError) {
          console.error(`Error archiving loser product ${loser.id}:`, loserError.message);
        } else {
          console.log(`🗑️ Archived loser product ${loser.id}: ${loser.name}`);
        }
      }
      
    } catch (error) {
      console.error(`Unexpected error processing ${productName}:`, error.message);
    }
  }
  
  console.log('\nGlitter Acrylic product cleanup completed!');
}

// Execute the script
fixGlitterAcrylics().catch(console.error);