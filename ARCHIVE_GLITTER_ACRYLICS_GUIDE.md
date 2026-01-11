# Guide to Archive Glitter Acrylic Products

## Problem Analysis

Based on the code analysis, I've identified the issue:

1. **The products are being activated instead of archived**: Looking at the SQL script [`scripts/update_glitter_acrylics_complete.sql`](scripts/update_glitter_acrylics_complete.sql), I can see that the glitter acrylic products are being set to `is_active = TRUE` (lines 10, 67, 124). This is likely why they're still showing on the shop page.

2. **The archiving process needs to be completed**: The products need to have both `is_active = FALSE` and `archived = TRUE` to be properly hidden from the shop.

## Solution

I've created two methods to archive the glitter acrylic products:

### Method 1: SQL Script (Recommended)

Use this SQL script in the Supabase SQL Editor:

```sql
-- SQL script to archive Glitter Acrylic products
-- This will set is_active to FALSE and archived to TRUE for the three Glitter Acrylic products

-- Archive Glitter Acrylic - Mienks
UPDATE products
SET
    is_active = FALSE,
    archived = TRUE,
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Mienks';

-- Archive Glitter Acrylic - Funfetti
UPDATE products
SET
    is_active = FALSE,
    archived = TRUE,
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Funfetti';

-- Archive Glitter Acrylic - Frozen
UPDATE products
SET
    is_active = FALSE,
    archived = TRUE,
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Frozen';

-- Verify the archiving
SELECT 
    id,
    name,
    sku,
    is_active,
    archived,
    updated_at
FROM 
    products
WHERE 
    name IN ('Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen')
ORDER BY 
    name;
```

**How to use this method:**
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Paste the above SQL script
4. Click "Run"
5. Verify the results in the output

### Method 2: JavaScript Script

If you prefer to use a script, I've created [`scripts/archive_glitter_acrylics.js`](scripts/archive_glitter_acrylics.js):

```javascript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with direct credentials
const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function archiveGlitterAcrylics() {
  try {
    console.log('🔍 Starting Glitter Acrylics archiving process...');
    
    // 1. Fetch the Glitter Acrylics products
    const { data: products, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .in('name', ['Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen']);

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError.message);
      return;
    }

    if (!products || products.length === 0) {
      console.log('ℹ️ No Glitter Acrylics products found to archive');
      return;
    }

    console.log(`📋 Found ${products.length} Glitter Acrylics products to archive`);
    
    // 2. Archive each product
    for (const product of products) {
      console.log(`🔄 Archiving product: ${product.name}`);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          is_active: false,
          archived: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (updateError) {
        console.error(`❌ Failed to archive ${product.name}:`, updateError.message);
      } else {
        console.log(`✅ Successfully archived ${product.name}`);
      }
    }

    console.log('🎉 Glitter Acrylics archiving complete!');

    // 3. Verify the archiving
    console.log('\n🔍 Verifying archived products...');
    const { data: verifiedProducts, error: verifyError } = await supabase
      .from('products')
      .select('id, name, sku, is_active, archived')
      .in('name', ['Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen']);

    if (verifyError) {
      console.error('❌ Error verifying products:', verifyError.message);
    } else {
      console.log('\n📊 Archived Products Status:');
      console.log('================================');
      verifiedProducts.forEach(product => {
        console.log(`\nProduct: ${product.name}`);
        console.log(`SKU: ${product.sku}`);
        console.log(`Active: ${product.is_active}`);
        console.log(`Archived: ${product.archived}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

archiveGlitterAcrylics();
```

**How to use this method:**
1. Make sure you have Node.js installed
2. Install the Supabase client: `npm install @supabase/supabase-js`
3. Run the script: `node scripts/archive_glitter_acrylics.js`

## Verification

After running either method, verify that:

1. **The products are no longer active**: Check that `is_active = FALSE`
2. **The products are marked as archived**: Check that `archived = TRUE`
3. **The products are hidden from the shop**: Visit your shop page and confirm the glitter acrylic products are no longer visible

## Additional Notes

- If you're still seeing the products on the shop page after archiving, there might be a caching issue. Try clearing your browser cache or waiting a few minutes for the changes to propagate.
- If you need to un-archive the products later, you can reverse the process by setting `is_active = TRUE` and `archived = FALSE`.
- The products will still exist in your database and can be accessed through the admin interface, but they won't be visible to customers on the shop page.