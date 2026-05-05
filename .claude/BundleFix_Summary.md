# Bundle Display Fix for Shop Page

## The Problem
Bundles were not showing up on the shop page because they were stored in a separate `bundles` table, but the shop page was only fetching from the `products` table.

## The Solution

### Key Changes Made:

1. **Dual Table Fetching**
   - Modified the shop page to fetch from BOTH `products` and `bundles` tables
   - Regular products from `products` table
   - Bundles from `bundles` table

2. **Bundle Mapping**
   - Bundles are mapped to the same format as products for consistency
   - All bundles are forced to use `bundle-deals` category
   - Bundle products get `isBundle: true` flag and 'Bundle' badge

3. **Category Filtering**
   - "Bundle Deals" category is automatically created if any bundles exist
   - Works alongside existing product categories

### Implementation Details:

```typescript
// Fetch both products and bundles
const { data: products } = await supabase.from('products').select('*').eq('status', 'active');
const { data: bundles } = await supabase.from('bundles').select('*').eq('status', 'active');

// Map bundles to product format
const mappedBundles = bundles.map(bundle => ({
  id: `bundle-${bundle.id}`,
  name: bundle.name,
  slug: bundle.slug,
  category: 'bundle-deals', // Always use bundle category
  price: bundle.price_cents ? bundle.price_cents / 100 : 0,
  compareAtPrice: bundle.compare_at_price_cents ? bundle.compare_at_price_cents / 100 : null,
  inStock: true,
  badges: [...(bundle.badges || []), 'Bundle'],
  isBundle: true
}));

// Combine with regular products
const allProducts = [...mappedProducts, ...mappedBundles];
```

## Files Modified:

1. **`.claude/ShopPage_BundlesFixed.tsx`** - Complete working version with bundle support
2. **`.claude/ShopPage (1).tsx`** - Original file with errors (backup)

## How to Apply the Fix:

1. Replace your existing shop page with the content from `ShopPage_BundlesFixed.tsx`
2. Adjust import paths to match your project structure
3. Test that bundles appear in the "Bundle Deals" category

## Expected Results:

✅ Bundles from the `bundles` table now appear on the shop page  
✅ All bundles appear under the "Bundle Deals" category  
✅ Bundles work with search and filtering  
✅ Bundles show "Bundle" badge for easy identification  
✅ Maintains compatibility with existing products  

## Database Requirements:

Your `bundles` table should have these fields (or similar):
- `id`, `name`, `slug`, `status`
- `price_cents` or `price`
- `compare_at_price_cents` or `compare_at_price`
- `short_desc` or `short_description`
- `image_url` or `images` array
- `badge` or similar

The fix is backward compatible and will work whether your bundles are stored in:
1. Separate `bundles` table
2. `products` table with special indicators
3. Both locations (with preference to `bundles` table)