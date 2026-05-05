// Simple variant addition script using your existing setup
const { createClient } = require('@supabase/supabase-js');

async function addVariantNow() {
  console.log('🚀 Adding Sweet Peach variant to Core Acrylics...');
  
  try {
    // Try to read env file
    const fs = require('fs');
    const path = require('path');
    
    // Check for .env file
    let envVars = {};
    try {
      const envPath = path.join(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
          if (line.trim() && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        });
      }
    } catch (e) {
      console.log('Could not read .env file, trying to proceed...');
    }

    // Get environment variables
    const supabaseUrl = process.env.VITE_SUPABASE_URL || envVars.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️  Environment variables not found, trying alternative method...');
      
      // Use the Netlify function approach
      await addViaNetlifyFunction();
      return;
    }

    console.log('✅ Found Supabase credentials, connecting...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find Core Acrylics product
    console.log('🔍 Looking for Core Acrylics product...');
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .or('sku.eq.ACR-746344,name.ilike.%core acrylic%')
      .limit(5);

    if (error) {
      console.error('❌ Database error:', error.message);
      await addViaNetlifyFunction();
      return;
    }

    if (!products || products.length === 0) {
      console.log('⚠️  Product not found with exact match, searching broadly...');
      
      const { data: allProducts } = await supabase
        .from('products')
        .select('*')
        .ilike('name', '%acrylic%')
        .limit(10);
        
      if (allProducts && allProducts.length > 0) {
        console.log(`📦 Found ${allProducts.length} products with "acrylic":`);
        allProducts.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
        
        const product = allProducts[0];
        console.log(`🎯 Using: ${product.name}`);
        await updateProduct(supabase, product);
      } else {
        console.log('❌ No products found, trying API method...');
        await addViaNetlifyFunction();
      }
      return;
    }

    const product = products[0];
    console.log(`✅ Found: ${product.name} (ID: ${product.id}, SKU: ${product.sku})`);
    await updateProduct(supabase, product);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.log('🔄 Trying alternative method...');
    await addViaNetlifyFunction();
  }
}

async function updateProduct(supabase, product) {
  try {
    console.log('📝 Adding Sweet Peach variant...');
    
    const existingVariants = Array.isArray(product.variants) ? product.variants : [];
    console.log(`Current variants: ${existingVariants.length}`);
    
    const newVariant = {
      name: "Sweet Peach",
      image: "https://res.cloudinary.com/dnlgohkcc/image/upload/v1763740353/peach-cuticile_pd063t.jpg"
    };
    
    const updatedVariants = [...existingVariants, newVariant];
    
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
      console.error('❌ Update failed:', error.message);
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
    console.error('❌ Update error:', error.message);
    return false;
  }
}

async function addViaNetlifyFunction() {
  console.log('🌐 Using Netlify function method...');
  
  try {
    // Find product via API
    console.log('🔍 Finding product via API...');
    const findResponse = await fetch('https://blom-admin.netlify.app/.netlify/functions/admin-product?slug=core-acrylics');
    
    if (!findResponse.ok) {
      throw new Error(`Product search failed: ${findResponse.status}`);
    }
    
    const findData = await findResponse.json();
    const product = findData.product;
    
    if (!product) {
      throw new Error('Product not found in API response');
    }
    
    console.log(`✅ Found via API: ${product.name} (ID: ${product.id})`);
    
    // Add variant via save-product API
    const updateData = {
      id: product.id,
      partial_update: true,
      variants: [
        ...(product.variants || []),
        {
          name: "Sweet Peach",
          image: "https://res.cloudinary.com/dnlgohkcc/image/upload/v1763740353/peach-cuticile_pd063t.jpg"
        }
      ]
    };
    
    console.log('📝 Sending variant update via API...');
    const saveResponse = await fetch('https://blom-admin.netlify.app/.netlify/functions/save-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });
    
    const saveResult = await saveResponse.json();
    
    if (saveResponse.ok && saveResult.ok) {
      console.log('🎉 SUCCESS! Variant added via API!');
      console.log(`Product: ${product.name}`);
      console.log(`Total variants: ${saveResult.product.variants?.length || 'unknown'}`);
      
      console.log('📋 All variants:');
      saveResult.product.variants?.forEach((variant, index) => {
        console.log(`  ${index + 1}. ${variant.name}`);
      });
    } else {
      throw new Error(saveResult.error || `API update failed: ${saveResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ API method failed:', error.message);
    console.log('');
    console.log('🛠️  MANUAL STEPS:');
    console.log('1. Go to your admin dashboard');
    console.log('2. Find "Core Acrylics" product');
    console.log('3. Edit the product');
    console.log('4. Add variant: "Sweet Peach"');
    console.log('5. Add image URL: https://res.cloudinary.com/dnlgohkcc/image/upload/v1763740353/peach-cuticile_pd063t.jpg');
    console.log('6. Save the product');
  }
}

// Run the script
addVariantNow();