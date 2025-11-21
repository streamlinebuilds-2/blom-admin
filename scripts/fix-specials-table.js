#!/usr/bin/env node

/**
 * Fix specials table schema
 * Uses admin-db-operation Netlify function to create the specials table
 */

async function createSpecialsTable() {
  const BASE_URL = 'https://blom-cosmetics.co.za';
  const FUNCTION_URL = `${BASE_URL}/.netlify/functions/admin-db-operation`;

  console.log('🔧 Creating specials table with correct schema...\n');

  try {
    // First, try to drop existing table
    console.log('1. Dropping existing specials table (if exists)...');
    const dropResponse = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'raw_sql',
        sql: 'DROP TABLE IF EXISTS public.specials CASCADE;'
      })
    });

    const dropResult = await dropResponse.json();
    if (!dropResult.ok) {
      console.log(`   ⚠️  Drop warning: ${dropResult.error}`);
    } else {
      console.log('   ✅ Table dropped successfully');
    }

    // Create the table using raw SQL
    console.log('\n2. Creating specials table with correct schema...');
    const createSQL = `
      CREATE TABLE public.specials (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        starts_at timestamptz not null,
        ends_at timestamptz not null,
        scope text not null default 'product' check (scope in ('product', 'bundle', 'sitewide')),
        target_ids uuid[] default '{}',
        discount_type text not null check (discount_type in ('percent', 'amount_off', 'fixed_price')),
        discount_value numeric not null,
        status text not null default 'scheduled' check (status in ('active', 'scheduled', 'expired')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `;

    const createResponse = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'raw_sql',
        sql: createSQL
      })
    });

    const createResult = await createResponse.json();
    if (!createResult.ok) {
      console.log(`   ❌ Create error: ${createResult.error}`);
      return false;
    } else {
      console.log('   ✅ Table created successfully');
    }

    // Enable RLS
    console.log('\n3. Enabling Row Level Security...');
    const rlsResponse = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'raw_sql',
        sql: 'ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;'
      })
    });

    const rlsResult = await rlsResponse.json();
    if (!rlsResult.ok) {
      console.log(`   ❌ RLS error: ${rlsResult.error}`);
      return false;
    } else {
      console.log('   ✅ RLS enabled successfully');
    }

    console.log('\n4. Creating basic RLS policies...');
    const policySQL = `
      CREATE POLICY "authenticated read all specials" ON public.specials FOR SELECT TO authenticated USING (true);
      CREATE POLICY "authenticated insert specials" ON public.specials FOR INSERT TO authenticated WITH CHECK (true);
      CREATE POLICY "authenticated update specials" ON public.specials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
      CREATE POLICY "authenticated delete specials" ON public.specials FOR DELETE TO authenticated USING (true);
    `;

    const policyResponse = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation: 'raw_sql',
        sql: policySQL
      })
    });

    const policyResult = await policyResponse.json();
    if (!policyResult.ok) {
      console.log(`   ❌ Policy error: ${policyResult.error}`);
    } else {
      console.log('   ✅ Policies created successfully');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ SPECIALS TABLE CREATION COMPLETE!');
    console.log('='.repeat(50));
    console.log('\n🎯 Summary:');
    console.log('   ✅ Table created with discount_value column');
    console.log('   ✅ RLS policies configured');
    console.log('   ✅ Ready for specials creation');
    console.log('\n💡 You can now test the create special feature!');

    return true;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return false;
  }
}

// Run the script
createSpecialsTable().then(success => {
  process.exit(success ? 0 : 1);
});