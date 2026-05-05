# Parent Glitter Acrylic Archive Solution

## Understanding the Requirement

The goal is to:
1. **Archive ONLY the parent "Glitter Acrylic" product**
2. **Keep all Glitter Acrylic variations ACTIVE** (Mienks, Funfetti, Frozen, etc.)
3. **Only the parent product should be hidden from the website**

## Problem Analysis

The previous solution incorrectly archived ALL Glitter Acrylic products including the variations. We need a more targeted approach.

## Solution

### Step 1: Reactivate the Variations

First, we need to ensure the Glitter Acrylic variations are active:

```sql
-- Run this SQL script first
\i scripts/reactivate_glitter_variations.sql
```

This script will:
- Reactivate "Glitter Acrylic - Mienks"
- Reactivate "Glitter Acrylic - Funfetti"  
- Reactivate "Glitter Acrylic - Frozen"
- Set their status to 'active' and is_active to TRUE

### Step 2: Archive Only the Parent Product

Then, archive only the parent "Glitter Acrylic" product:

```sql
-- Run this SQL script second
\i scripts/archive_only_parent_glitter.sql
```

This script will:
- Archive ONLY the product named exactly "Glitter Acrylic" (the parent)
- Set its status to 'archived' and is_active to FALSE
- Leave all variations active

### Step 3: Verify the Setup

After running both scripts, verify the configuration:

```sql
-- Check the final status of all Glitter Acrylic products
SELECT 
    id, 
    name, 
    slug, 
    sku, 
    is_active, 
    status, 
    CASE 
        WHEN name = 'Glitter Acrylic' THEN 'PARENT (should be archived)'
        ELSE 'VARIATION (should be active)'
    END as product_type,
    (is_active = TRUE AND status != 'archived') as will_display_on_website
FROM 
    products
WHERE 
    name ILIKE '%Glitter Acrylic%'
ORDER BY 
    name;
```

## Expected Results

| Product Name | is_active | status | Will Display on Website |
|--------------|-----------|--------|------------------------|
| Glitter Acrylic | FALSE | archived | ❌ No (archived) |
| Glitter Acrylic - Mienks | TRUE | active | ✅ Yes |
| Glitter Acrylic - Funfetti | TRUE | active | ✅ Yes |
| Glitter Acrylic - Frozen | TRUE | active | ✅ Yes |

## How the API Filtering Works

The fixed `admin-products.ts` endpoint will:

1. **Default behavior**: Return only products where `is_active = TRUE` AND `status != 'archived'`
2. **Result**: Only the active variations will be returned, not the archived parent

## Implementation Steps

### Option A: Using SQL Scripts (Recommended)

1. **Reactivate variations**:
   ```bash
   # Run in your Supabase SQL editor or via psql
   \i scripts/reactivate_glitter_variations.sql
   ```

2. **Archive parent only**:
   ```bash
   # Run in your Supabase SQL editor or via psql  
   \i scripts/archive_only_parent_glitter.sql
   ```

### Option B: Using JavaScript Scripts

If you prefer JavaScript, here are equivalent scripts:

**Reactivate variations**:
```javascript
// scripts/reactivate_glitter_variations.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function reactivateVariations() {
  try {
    console.log('🔄 Reactivating Glitter Acrylic variations...');
    
    // Reactivate the three main variations
    const variations = [
      'Glitter Acrylic - Mienks',
      'Glitter Acrylic - Funfetti', 
      'Glitter Acrylic - Frozen'
    ];
    
    for (const name of variations) {
      const { error } = await supabase
        .from('products')
        .update({
          is_active: true,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('name', name);
      
      if (error) {
        console.error(`❌ Failed to reactivate ${name}:`, error.message);
      } else {
        console.log(`✅ Reactivated ${name}`);
      }
    }
    
    console.log('🎉 Variation reactivation complete!');
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

reactivateVariations();
```

**Archive parent only**:
```javascript
// scripts/archive_parent_only.js  
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yvmnedjybrpvlupygusf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function archiveParentOnly() {
  try {
    console.log('🔄 Archiving parent Glitter Acrylic product...');
    
    // Archive only the parent product
    const { error } = await supabase
      .from('products')
      .update({
        is_active: false,
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('name', 'Glitter Acrylic'); // Only the parent, exact match
    
    if (error) {
      console.error('❌ Failed to archive parent product:', error.message);
    } else {
      console.log('✅ Archived parent Glitter Acrylic product');
    }
    
    console.log('🎉 Parent archiving complete!');
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

archiveParentOnly();
```

## Troubleshooting

### If the parent product is not found
The script looks for a product with the exact name "Glitter Acrylic". If this doesn't match your parent product name, you may need to adjust the query. Check your actual parent product name first:

```sql
SELECT name, id FROM products WHERE name LIKE '%Glitter Acrylic%' AND name NOT LIKE '%-%';
```

### If variations are still not showing
1. Check that the API filtering is working correctly
2. Verify the variations have `is_active = TRUE` and `status = 'active'`
3. Clear any caches that might be affecting the display

## Rollback

If you need to undo these changes:

```sql
-- Reactivate everything
UPDATE products 
SET is_active = TRUE, status = 'active' 
WHERE name ILIKE '%Glitter Acrylic%';
```

## Summary

This solution provides a targeted approach to archive only the parent Glitter Acrylic product while keeping all variations active and visible on the website. The API filtering will automatically exclude the archived parent but include the active variations.