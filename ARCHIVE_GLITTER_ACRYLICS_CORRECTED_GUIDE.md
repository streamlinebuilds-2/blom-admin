# Corrected Guide to Archive Glitter Acrylic Products

## Problem Analysis

I've identified the issue and corrected it:

1. **The products table structure**: The products table has a `status` column (not `is_active` or `archived` columns as I initially thought).

2. **The correct approach**: To archive products, we need to set `status = 'archived'` instead of trying to use non-existent columns.

3. **Why products are still showing**: The products likely have a status like 'published' or 'active' instead of 'archived'.

## Solution Created

### Method 1: Corrected SQL Script (Recommended)

Use this SQL script in the Supabase SQL Editor:

```sql
-- Corrected SQL script to archive Glitter Acrylic products
-- This will set status to 'archived' for the three Glitter Acrylic products

-- Archive Glitter Acrylic - Mienks
UPDATE products
SET
    status = 'archived',
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Mienks';

-- Archive Glitter Acrylic - Funfetti
UPDATE products
SET
    status = 'archived',
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Funfetti';

-- Archive Glitter Acrylic - Frozen
UPDATE products
SET
    status = 'archived',
    updated_at = NOW()
WHERE 
    name = 'Glitter Acrylic - Frozen';

-- Verify the archiving
SELECT 
    id,
    name,
    slug,
    sku,
    status,
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
3. Copy and paste the above SQL script from [`scripts/archive_glitter_acrylics_corrected.sql`](scripts/archive_glitter_acrylics_corrected.sql)
4. Click "Run"
5. Verify the results show `status = 'archived'` for all three products

### Method 2: Corrected JavaScript Script

If you prefer to use a script, I've created [`scripts/archive_glitter_acrylics_corrected.js`](scripts/archive_glitter_acrylics_corrected.js):

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
    
    // 2. Archive each product by setting status to 'archived'
    for (const product of products) {
      console.log(`🔄 Archiving product: ${product.name}`);
      
      const { error: updateError } = await supabase
        .from('products')
        .update({
          status: 'archived',
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
      .select('id, name, slug, sku, status')
      .in('name', ['Glitter Acrylic - Mienks', 'Glitter Acrylic - Funfetti', 'Glitter Acrylic - Frozen']);

    if (verifyError) {
      console.error('❌ Error verifying products:', verifyError.message);
    } else {
      console.log('\n📊 Archived Products Status:');
      console.log('================================');
      verifiedProducts.forEach(product => {
        console.log(`\nProduct: ${product.name}`);
        console.log(`Slug: ${product.slug}`);
        console.log(`SKU: ${product.sku}`);
        console.log(`Status: ${product.status}`);
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
3. Run the script: `node scripts/archive_glitter_acrylics_corrected.js`

## Verification

After running either method, verify that:

1. **The products have archived status**: Check that `status = 'archived'`
2. **The products are hidden from the shop**: Visit your shop page and confirm the glitter acrylic products are no longer visible
3. **The products still exist in database**: They can still be accessed through the admin interface for reference

## How the Shop Page Works

Based on the products table structure, the shop page likely filters products by their status. Products with:
- `status = 'published'` or `status = 'active'` → Visible on shop page
- `status = 'archived'` or `status = 'draft'` → Hidden from shop page

## Additional Notes

- If you're still seeing the products on the shop page after archiving, there might be a caching issue. Try clearing your browser cache or waiting a few minutes for the changes to propagate.
- If you need to un-archive the products later, you can reverse the process by setting `status = 'published'` or `status = 'active'`.
- The products will still exist in your database and can be accessed through the admin interface, but they won't be visible to customers on the shop page.
- If you get API key errors when running the JavaScript script, you may need to update the credentials in the script with your current Supabase service role key.