import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function addVariantManually() {
  try {
    // Find the product by SKU
    const { data: product, error: findError } = await supabase
      .from('products')
      .select('*')
      .eq('sku', 'ACR-746344')
      .single();

    if (findError) {
      console.error('Error finding product:', findError);
      return;
    }

    if (!product) {
      console.error('Product not found with SKU ACR-746344');
      return;
    }

    console.log('Found product:', product.name);
    console.log('Current variants:', JSON.stringify(product.variants, null, 2));

    // Get existing variants or initialize empty array
    const existingVariants = Array.isArray(product.variants) ? product.variants : [];
    
    // Add the new variant
    const newVariant = {
      name: "Sweet Peach",
      image: "https://res.cloudinary.com/dnlgohkcc/image/upload/v1763740353/peach-cuticile_pd063t.jpg"
    };

    const updatedVariants = [...existingVariants, newVariant];

    // Update the product with the new variant
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ 
        variants: updatedVariants,
        updated_at: new Date().toISOString()
      })
      .eq('id', product.id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating product:', updateError);
      return;
    }

    console.log('✅ Successfully added variant!');
    console.log('Updated product variants:', JSON.stringify(updatedProduct.variants, null, 2));
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addVariantManually();