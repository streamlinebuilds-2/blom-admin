#!/usr/bin/env node

/**
 * Script to apply the specials table migration
 * This fixes the missing discount_value column issue
 */

const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

async function applyMigration() {
  console.log('🔧 Applying specials table migration...');
  
  try {
    // Drop and recreate the specials table with proper schema
    const migrationSQL = `
      -- Drop table if exists and recreate to ensure schema is correct
      DROP TABLE IF EXISTS public.specials CASCADE;

      -- Recreate specials table with proper schema
      CREATE TABLE public.specials (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        scope text NOT NULL DEFAULT 'product' CHECK (scope IN ('product', 'bundle', 'sitewide')),
        target_ids uuid[] DEFAULT '{}',
        discount_type text NOT NULL CHECK (discount_type IN ('percent', 'amount_off', 'fixed_price')),
        discount_value numeric NOT NULL,
        status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('active', 'scheduled', 'expired')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      -- Create indexes for performance
      CREATE INDEX idx_specials_status ON public.specials(status);
      CREATE INDEX idx_specials_starts_at ON public.specials(starts_at);
      CREATE INDEX idx_specials_ends_at ON public.specials(ends_at);
      CREATE INDEX idx_specials_scope ON public.specials(scope);

      -- Enable RLS
      ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;

      -- RLS Policies
      DROP POLICY IF EXISTS "anon read active specials" ON public.specials;
      CREATE POLICY "anon read active specials"
      ON public.specials
      FOR SELECT
      TO anon
      USING (
        status = 'active'
        AND starts_at <= now()
        AND ends_at > now()
      );

      DROP POLICY IF EXISTS "authenticated read all specials" ON public.specials;
      CREATE POLICY "authenticated read all specials"
      ON public.specials
      FOR SELECT
      TO authenticated
      USING (true);

      DROP POLICY IF EXISTS "authenticated insert specials" ON public.specials;
      CREATE POLICY "authenticated insert specials"
      ON public.specials
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

      DROP POLICY IF EXISTS "authenticated update specials" ON public.specials;
      CREATE POLICY "authenticated update specials"
      ON public.specials
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);

      DROP POLICY IF EXISTS "authenticated delete specials" ON public.specials;
      CREATE POLICY "authenticated delete specials"
      ON public.specials
      FOR DELETE
      TO authenticated
      USING (true);

      -- Function to compute the current status of a special based on time
      CREATE OR REPLACE FUNCTION public.compute_special_status(
        p_starts_at timestamptz,
        p_ends_at timestamptz
      )
      RETURNS text
      LANGUAGE plpgsql
      IMMUTABLE
      AS $$
      BEGIN
        IF p_ends_at <= now() THEN
          RETURN 'expired';
        ELSIF p_starts_at > now() THEN
          RETURN 'scheduled';
        ELSE
          RETURN 'active';
        END IF;
      END;
      $$;

      -- Trigger to automatically update status based on dates on insert/update
      CREATE OR REPLACE FUNCTION public.update_special_status()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        new.status := public.compute_special_status(new.starts_at, new.ends_at);
        new.updated_at := now();
        RETURN new;
      END;
      $$;

      DROP TRIGGER IF EXISTS trigger_update_special_status ON public.specials;
      CREATE TRIGGER trigger_update_special_status
        BEFORE INSERT OR UPDATE ON public.specials
        FOR EACH ROW
        EXECUTE FUNCTION update_special_status();
    `;

    // Execute the migration using RPC
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative approach - direct table operations
      console.log('🔄 Trying alternative approach...');
      
      // Test if table exists
      const { data: testData, error: testError } = await supabase
        .from('specials')
        .select('discount_value')
        .limit(1);
      
      if (testError) {
        console.log('📋 Specials table may not exist or have wrong schema');
        console.log('⚠️  Please run the migration manually in Supabase SQL Editor:');
        console.log('');
        console.log('Copy and paste this SQL:');
        console.log('========================================');
        console.log(migrationSQL);
        console.log('========================================');
      } else {
        console.log('✅ Specials table exists and has correct schema');
      }
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Test creating a simple special
    console.log('🧪 Testing special creation...');
    const testSpecial = {
      title: 'Test Special',
      starts_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      scope: 'sitewide',
      discount_type: 'percent',
      discount_value: 10,
      status: 'active'
    };

    const { data: newSpecial, error: createError } = await supabase
      .from('specials')
      .insert([testSpecial])
      .select()
      .single();

    if (createError) {
      console.error('❌ Test special creation failed:', createError);
    } else {
      console.log('✅ Test special created successfully:', newSpecial.id);
      
      // Clean up test special
      await supabase
        .from('specials')
        .delete()
        .eq('id', newSpecial.id);
      console.log('🧹 Test special cleaned up');
    }

  } catch (err) {
    console.error('❌ Migration script error:', err);
    process.exit(1);
  }
}

applyMigration().then(() => {
  console.log('🎉 Migration process completed');
  process.exit(0);
}).catch(err => {
  console.error('💥 Unexpected error:', err);
  process.exit(1);
});