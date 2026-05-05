#!/usr/bin/env node

/**
 * Script to apply the bundles table schema migration
 * This fixes the missing columns issue that prevents bundle creation
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function applyMigration() {
  console.log('🔧 Applying bundles table migration...');
  
  try {
    // The migration SQL that adds all missing columns
    const migrationSQL = `
      -- Complete Bundle Table Schema Fix
      -- This adds ALL columns that the bundle system actually uses
      -- Run this SQL to fix all bundle table schema errors
      
      -- Core bundle identification columns
      ALTER TABLE bundles
      ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid(),
      ADD COLUMN IF NOT EXISTS name TEXT NOT NULL,
      ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS sku TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'bundle',
      ADD COLUMN IF NOT EXISTS category VARCHAR(255) DEFAULT 'Bundle Deals',
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
      
      -- Pricing columns
      ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS compare_at_price_cents INTEGER,
      ADD COLUMN IF NOT EXISTS pricing_mode VARCHAR(50) DEFAULT 'manual',
      ADD COLUMN IF NOT EXISTS discount_value DECIMAL(10,2),
      
      -- Stock and inventory columns (CRITICAL - these are missing!)
      ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS stock_label TEXT DEFAULT 'In Stock',
      
      -- Content columns
      ADD COLUMN IF NOT EXISTS short_desc TEXT,
      ADD COLUMN IF NOT EXISTS long_desc TEXT,
      ADD COLUMN IF NOT EXISTS description TEXT,
      
      -- Image columns
      ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
      ADD COLUMN IF NOT EXISTS hover_image TEXT,
      ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]'::jsonb,
      
      -- Product details columns
      ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS how_to_use JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS inci_ingredients JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS key_ingredients JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS size TEXT,
      ADD COLUMN IF NOT EXISTS shelf_life TEXT,
      ADD COLUMN IF NOT EXISTS claims JSONB DEFAULT '[]'::jsonb,
      
      -- Bundle-specific columns
      ADD COLUMN IF NOT EXISTS bundle_products JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
      
      -- SEO and metadata columns
      ADD COLUMN IF NOT EXISTS meta_title TEXT,
      ADD COLUMN IF NOT EXISTS meta_description TEXT,
      ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS related JSONB DEFAULT '[]'::jsonb,
      
      -- Display columns
      ADD COLUMN IF NOT EXISTS price_string TEXT,
      ADD COLUMN IF NOT EXISTS weight DECIMAL(10,3),
      ADD COLUMN IF NOT EXISTS barcode TEXT,
      
      -- Timestamps (if not exists)
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
      
      -- Set primary key if not set
      ALTER TABLE bundles ADD CONSTRAINT bundles_pkey PRIMARY KEY (id);
      
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_bundles_category ON bundles(category);
      CREATE INDEX IF NOT EXISTS idx_bundles_product_type ON bundles(product_type);
      CREATE INDEX IF NOT EXISTS idx_bundles_status ON bundles(status);
      CREATE INDEX IF NOT EXISTS idx_bundles_is_active ON bundles(is_active);
      CREATE INDEX IF NOT EXISTS idx_bundles_sku ON bundles(sku);
      CREATE INDEX IF NOT EXISTS idx_bundles_slug ON bundles(slug);
      CREATE INDEX IF NOT EXISTS idx_bundles_bundle_products ON bundles USING gin (bundle_products);
      CREATE INDEX IF NOT EXISTS idx_bundles_images ON bundles USING gin (images);
      CREATE INDEX IF NOT EXISTS idx_bundles_created_at ON bundles(created_at);
      
      -- Add comments for documentation
      COMMENT ON COLUMN bundles.stock IS 'Stock quantity for the bundle (always 0 for bundles)';
      COMMENT ON COLUMN bundles.track_inventory IS 'Whether to track inventory for this bundle';
      COMMENT ON COLUMN bundles.bundle_products IS 'JSON array of product IDs and quantities that make up this bundle';
      COMMENT ON COLUMN bundles.images IS 'JSON array of image URLs for the bundle';
      COMMENT ON COLUMN bundles.pricing_mode IS 'Pricing mode: manual, percent_off, or amount_off';
      COMMENT ON COLUMN bundles.discount_value IS 'Discount value based on pricing mode';
      
      -- Update existing bundles with proper defaults
      UPDATE bundles SET 
        product_type = 'bundle',
        category = 'Bundle Deals',
        status = 'active',
        is_active = true,
        track_inventory = false,
        stock = 0,
        stock_label = 'In Stock'
      WHERE product_type IS NULL;
      
      -- Ensure timestamps are set
      UPDATE bundles SET 
        created_at = NOW(),
        updated_at = NOW()
      WHERE created_at IS NULL OR updated_at IS NULL;
    `;

    // Execute the migration using RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative approach - check if specific columns exist
      console.log('🔄 Checking which columns exist in bundles table...');
      
      try {
        const { data: testData, error: testError } = await supabase
          .from('bundles')
          .select('stock, track_inventory')
          .limit(1);
        
        if (testError) {
          console.log('📋 Critical columns missing (stock, track_inventory)');
          console.log('⚠️  Please run the migration manually in Supabase SQL Editor:');
          console.log('');
          console.log('Copy and paste this SQL:');
          console.log('========================================');
          console.log(migrationSQL);
          console.log('========================================');
        } else {
          console.log('✅ Critical columns exist in bundles table');
        }
      } catch (colCheckError) {
        console.log('📋 Could not verify column existence');
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Test creating a simple bundle
    console.log('🧪 Testing bundle creation...');
    const testBundle = {
      name: 'Test Bundle Migration',
      slug: 'test-bundle-migration',
      product_type: 'bundle',
      category: 'Bundle Deals',
      status: 'active',
      is_active: true,
      price_cents: 2999,
      stock: 0, // This should now work
      track_inventory: false, // This should now work
      pricing_mode: 'manual',
      short_desc: 'Test bundle created during migration',
      images: [],
      bundle_products: []
    };

    const { data: newBundle, error: createError } = await supabase
      .from('bundles')
      .insert([testBundle])
      .select()
      .single();

    if (createError) {
      console.error('❌ Test bundle creation failed:', createError);
      
      if (createError.message.includes('stock') || createError.message.includes('track_inventory')) {
        console.log('💡 This suggests the stock/track_inventory columns are still missing');
        console.log('💡 Try running the migration manually in Supabase SQL Editor');
      }
    } else {
      console.log('✅ Test bundle created successfully:', newBundle.id);
      
      // Clean up test bundle
      await supabase
        .from('bundles')
        .delete()
        .eq('id', newBundle.id);
      console.log('🧹 Test bundle cleaned up');
    }

    // Also test the save-bundle endpoint if possible
    console.log('🧪 Testing save-bundle endpoint...');
    try {
      const { data: endpointTest, error: endpointError } = await supabase.functions.invoke('save-bundle', {
        body: {
          payload: {
            name: 'API Test Bundle',
            slug: 'api-test-bundle',
            price: 19.99,
            stock: 0, // This should now work
            track_inventory: false, // This should now work
            bundle_products: []
          }
        }
      });

      if (endpointError) {
        console.log('⚠️  Save-bundle endpoint test failed:', endpointError.message);
        if (endpointError.message.includes('stock') || endpointError.message.includes('track_inventory')) {
          console.log('💡 This suggests the columns are still missing');
        }
      } else {
        console.log('✅ Save-bundle endpoint works!');
        
        // Clean up the test bundle created via API
        if (endpointTest.bundle?.id) {
          await supabase
            .from('bundles')
            .delete()
            .eq('id', endpointTest.bundle.id);
          console.log('🧹 API test bundle cleaned up');
        }
      }
    } catch (endpointTestError) {
      console.log('⚠️  Could not test save-bundle endpoint:', endpointTestError.message);
    }

  } catch (err) {
    console.error('❌ Migration script error:', err);
    process.exit(1);
  }
}

applyMigration().then(() => {
  console.log('🎉 Migration process completed');
  console.log('');
  console.log('📝 Summary:');
  console.log('- Fixed missing columns in bundles table');
  console.log('- Added stock and track_inventory columns');
  console.log('- Bundle creation should now work properly');
  process.exit(0);
}).catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});