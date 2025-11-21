/**
 * Fix Sign-up Coupons Script
 * 
 * This script updates all sign-up coupons (BLOM####-XXXXXX pattern) to have:
 * - type: 'percentage'
 * - value: 10 (for 10% discount)
 * - max_uses: 1 (single use only)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function fixSignupCoupons() {
  console.log('🔍 Finding sign-up coupons (BLOM####-XXXXXX pattern)...\n');

  // Find all sign-up coupons
  const { data: coupons, error: fetchError } = await supabase
    .from('coupons')
    .select('id, code, type, value, max_uses, is_active, used_count')
    .like('code', 'BLOM____-%');

  if (fetchError) {
    console.error('❌ Error fetching coupons:', fetchError.message);
    process.exit(1);
  }

  if (!coupons || coupons.length === 0) {
    console.log('ℹ️  No sign-up coupons found');
    return;
  }

  console.log(`📊 Found ${coupons.length} sign-up coupons\n`);

  // Display current state
  console.log('Current state:');
  console.table(coupons.map(c => ({
    Code: c.code,
    Type: c.type,
    Value: c.value,
    'Max Uses': c.max_uses,
    'Used Count': c.used_count || 0,
    Active: c.is_active ? 'Yes' : 'No'
  })));

  // Find coupons that need fixing
  const couponsToFix = coupons.filter(c =>
    c.type !== 'percentage' || c.value !== 10 || c.max_uses !== 1
  );

  if (couponsToFix.length === 0) {
    console.log('\n✅ All sign-up coupons are already correctly configured!');
    return;
  }

  console.log(`\n🔧 Fixing ${couponsToFix.length} coupons...\n`);

  // Update each coupon
  let successCount = 0;
  let errorCount = 0;

  for (const coupon of couponsToFix) {
    const { error } = await supabase
      .from('coupons')
      .update({
        type: 'percentage',
        value: 10,
        max_uses: 1
      })
      .eq('id', coupon.id);

    if (error) {
      console.error(`❌ Failed to update ${coupon.code}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Updated ${coupon.code} → 10% discount, single use`);
      successCount++;
    }
  }

  console.log(`\n📈 Results:`);
  console.log(`   ✅ Successfully updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Failed: ${errorCount}`);
  }

  // Display final state
  const { data: updatedCoupons } = await supabase
    .from('coupons')
    .select('id, code, type, value, max_uses, is_active, used_count')
    .like('code', 'BLOM____-%');

  console.log('\nFinal state:');
  console.table(updatedCoupons.map(c => ({
    Code: c.code,
    Type: c.type,
    Value: c.value,
    'Max Uses': c.max_uses,
    'Used Count': c.used_count || 0,
    Active: c.is_active ? 'Yes' : 'No'
  })));

  console.log('\n✨ Done!');
}

// Run the script
fixSignupCoupons().catch(err => {
  console.error('❌ Script error:', err);
  process.exit(1);
});
