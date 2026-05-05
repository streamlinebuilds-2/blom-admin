#!/usr/bin/env node

// Migration runner for fixing invalid coupon types
// This script executes the migration to fix invalid coupon types

import { createClient } from '@supabase/supabase-js';

// Use hardcoded credentials from existing working scripts
const SUPABASE_URL = 'https://yvmnedjybrpvlupygusf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 Starting coupon type fix migration...');
  
  const migrationSQL = `
    DO $$
    DECLARE
        invalid_types RECORD;
        fixed_count INTEGER := 0;
        constraint_exists BOOLEAN;
    BEGIN
        RAISE NOTICE '=== Starting Coupon Type Fix Migration ===';
        
        -- Step 1: Display current invalid types
        RAISE NOTICE 'Step 1: Identifying invalid coupon types...';
        FOR invalid_types IN 
            SELECT type, COUNT(*) as count
            FROM coupons 
            WHERE type NOT IN ('percent', 'fixed')
            GROUP BY type
            ORDER BY count DESC
        LOOP
            RAISE NOTICE '  Found % coupons with invalid type: %', invalid_types.count, invalid_types.type;
        END LOOP;
        
        -- Step 2: Check if constraint exists and temporarily disable it
        RAISE NOTICE 'Step 2: Temporarily disabling check constraint...';
        
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.check_constraints 
            WHERE constraint_name = 'coupons_type_check'
        ) INTO constraint_exists;
        
        IF constraint_exists THEN
            RAISE NOTICE '  Dropping existing check constraint...';
            ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_type_check;
        ELSE
            RAISE NOTICE '  No existing check constraint found';
        END IF;
        
        -- Step 3: Update invalid types to valid ones
        RAISE NOTICE 'Step 3: Updating invalid coupon types...';
        
        UPDATE coupons 
        SET 
            type = CASE 
                WHEN type = 'percentage' THEN 'percent'
                WHEN type = '%' THEN 'percent'
                WHEN type = 'amount' THEN 'fixed'
                WHEN type = 'r' THEN 'fixed'
                WHEN type = 'rand' THEN 'fixed'
                WHEN type = 'percent' THEN 'percent'
                WHEN type = 'fixed' THEN 'fixed'
                ELSE 'percent'
            END,
            updated_at = now()
        WHERE type NOT IN ('percent', 'fixed');
        
        GET DIAGNOSTICS fixed_count = ROW_COUNT;
        
        RAISE NOTICE '  Updated % coupon records with new type values', fixed_count;
        
        -- Step 4: Re-enable the check constraint
        RAISE NOTICE 'Step 4: Re-enabling check constraint...';
        ALTER TABLE coupons ADD CONSTRAINT coupons_type_check 
        CHECK (type IN ('percent', 'fixed'));
        
        RAISE NOTICE '  Check constraint re-enabled';
        
        -- Step 5: Verify all types are now valid
        RAISE NOTICE 'Step 5: Verifying data integrity...';
        
        IF EXISTS (SELECT 1 FROM coupons WHERE type NOT IN ('percent', 'fixed')) THEN
            RAISE EXCEPTION 'Migration failed: Invalid coupon types still exist after update';
        ELSE
            RAISE NOTICE '  SUCCESS: All coupon types are now valid (percent or fixed)';
        END IF;
        
        -- Step 6: Display summary
        RAISE NOTICE '=== Migration Summary ===';
        RAISE NOTICE 'Total coupons processed: %', fixed_count;
        RAISE NOTICE 'Final type distribution:';
        FOR invalid_types IN 
            SELECT type, COUNT(*) as count
            FROM coupons 
            GROUP BY type
            ORDER BY count DESC
        LOOP
            RAISE NOTICE '  - Type: %, Count: %', invalid_types.type, invalid_types.count;
        END LOOP;
        
        RAISE NOTICE '=== Migration Completed Successfully ===';
        
    END $$;
  `;

  try {
    // Use the execute-sql function if available, otherwise use direct RPC
    let result;
    
    try {
      // Try using the execute-sql function
      const { data, error } = await admin.functions.invoke('execute-sql', {
        body: { query: migrationSQL }
      });
      
      if (error) {
        throw error;
      }
      
      result = data;
      console.log('✅ Migration executed via execute-sql function');
    } catch (funcError) {
      console.log('⚠️  execute-sql function not available, trying direct RPC...');
      
      // Fallback to direct RPC call
      const { data, error } = await admin.rpc('exec_sql', {
        sql_query: migrationSQL,
        sql_params: []
      });
      
      if (error) {
        throw error;
      }
      
      result = data;
      console.log('✅ Migration executed via direct RPC');
    }
    
    console.log('\n📊 Migration Results:');
    console.log(JSON.stringify(result, null, 2));
    
    // Also fetch final coupon type distribution
    console.log('\n🔍 Fetching final coupon type distribution...');
    const { data: finalDistribution, error: fetchError } = await admin
      .from('coupons')
      .select('type')
      .order('type');
    
    if (!fetchError && finalDistribution) {
      const distribution = {};
      finalDistribution.forEach(coupon => {
        distribution[coupon.type] = (distribution[coupon.type] || 0) + 1;
      });
      
      console.log('\n📈 Final coupon type distribution:');
      Object.entries(distribution).forEach(([type, count]) => {
        console.log(`  - ${type}: ${count} coupons`);
      });
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

runMigration();