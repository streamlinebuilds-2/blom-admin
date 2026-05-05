// Simple variant addition using project structure
import { createClient } from '@supabase/supabase-js';

// Read environment variables from .env
const fs = await import('fs');
const path = await import('path');

function readEnvVars() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      envContent.split('\n').forEach(line => {
        if (line.trim() && !line.startsWith('#')) {
          const [key, ...valueParts] = line.split('=');
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      });
      return envVars;
    }
  } catch (e) {
    console.log('No .env file found');
  }
  return {};
}

async function addVariant() {
  console.log('🛠️ Adding Sweet Peach variant to Core Acrylics...');
  
  // Get environment variables
  const envVars = readEnvVars();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ No Supabase credentials found. Trying alternative...');
    return;
  }

  console.log('✅ Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Find the Core Acrylics product
    console.log('🔍 Searching for Core Acrylics product...');
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .or('sku.eq.ACR-746344,name.ilike.%core%,name.ilike.%acrylic%')
      .limit(5);

    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }

    if (!products || products.length === 0) {
      console.log('❌ Product not found. Searching for any acrylic products...');
      
      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .ilike('name', '%acrylic%')
        .limit(10);
        
      if (allProducts && allProducts.length > 0) {
        console.log(`📦 Found ${allProducts.length} acrylic products:`);
        allProducts.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
        
        // Use the first match
        const product = allProducts[0];
        console.log(`🎯 Using product: ${product.name}`);
        
        await updateProductVariants(supabase, product);
        return;
      }
      
      console.log('❌ No products found at all');
      return;
    }

    const product = products[0];
    console.log(`✅ Found: ${product.name} (SKU: ${product.sku})`);
    await updateProductVariants(supabase, product);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function updateProductVariants(supabase, product) {
  try {
    console.log('📝 Adding Sweet Peach variant...');
    
    const existingVariants = Array.isArray(product.variants) ? product.variants : [];
    console.log(`Current variants: ${existingVariants.length}`);
    
    const newVariant = {
      name: "Sweet Peach",
      image: "https://res.cloudinary.com/dnlgohkcc/image/upload/v1763740353/peach-cuticile_pd063t.jpg"
    };
    
    const updatedVariants = [...existingVariants, newVariant];
    console.log(`New variants count: ${updatedVariants.length}`);
    
    // Update the product
    const { data, error } = await supabase
      .from('products')
      .update({ 
        variants: updatedVariants,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Update error:', error.message);
      return false;
    }

    console.log('🎉 SUCCESS! Variant added!');
    console.log(`Product: ${data.name}`);
    console.log(`Total variants: ${data.variants?.length || 0}`);
    
    console.log('📋 All variants:');
    data.variants?.forEach((variant, index) => {
      console.log(`  ${index + 1}. ${variant.name}`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    return false;
  }
}

// Run the function
addVariant();