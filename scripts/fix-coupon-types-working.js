#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yvmnedjybrpvlupygusf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

console.log('🚀 Starting coupon type fix migration...');
console.log('Step 1: Checking current coupon types...');

try {
  // Get all coupon types first to see what we're working with
  const { data: allCoupons, error } = await admin
    .from('coupons')
    .select('id, code, type')
    .order('type');
  
  if (error) {
    console.error('❌ Error fetching coupons:', error.message);
    process.exit(1);
  }
  
  console.log(`✅ Found ${allCoupons.length} total coupons`);
  
  // Count types
  const typeCounts = {};
  allCoupons.forEach(coupon => {
    typeCounts[coupon.type] = (typeCounts[coupon.type] || 0) + 1;
  });
  
  console.log('📊 Current coupon type distribution:');
  Object.entries(typeCounts).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count} coupons`);
  });
  
  // Find invalid types
  const validTypes = ['percent', 'fixed'];
  const invalidTypes = Object.keys(typeCounts).filter(type => !validTypes.includes(type));
  
  if (invalidTypes.length === 0) {
    console.log('🎉 All coupon types are already valid!');
    process.exit(0);
  }
  
  console.log(`\\n⚠️ Found ${invalidTypes.length} invalid type(s):`, invalidTypes);
  
  // Update each invalid type
  let totalUpdated = 0;
  
  for (const invalidType of invalidTypes) {
    let newType = 'percent'; // default
    let updatedCount = 0;
    
    // Determine mapping
    if (invalidType === 'percentage' || invalidType === '%' || invalidType === 'percent') {
      newType = 'percent';
    } else if (invalidType === 'amount' || invalidType === 'r' || invalidType === 'rand' || invalidType === 'fixed') {
      newType = 'fixed';
    }
    
    console.log(`\\nUpdating "${invalidType}" to "${newType}"...`);
    
    const { data: updated, error: updateError } = await admin
      .from('coupons')
      .update({ 
        type: newType,
        updated_at: new Date().toISOString()
      })
      .eq('type', invalidType)
      .select('id');
    
    if (updateError) {
      console.error(`❌ Error updating ${invalidType}:`, updateError.message);
    } else {
      updatedCount = updated.length;
      totalUpdated += updatedCount;
      console.log(`✅ Updated ${updatedCount} coupons from "${invalidType}" to "${newType}"`);
    }
  }
  
  console.log(`\\n📝 Total coupons updated: ${totalUpdated}`);
  
  // Final verification
  console.log('\\nStep 2: Final verification...');
  
  const { data: finalCoupons, error: finalError } = await admin
    .from('coupons')
    .select('type')
    .order('type');
  
  if (finalError) {
    console.error('❌ Error in final verification:', finalError.message);
    process.exit(1);
  }
  
  const finalTypeCounts = {};
  finalCoupons.forEach(coupon => {
    finalTypeCounts[coupon.type] = (finalTypeCounts[coupon.type] || 0) + 1;
  });
  
  console.log('📈 Final coupon type distribution:');
  Object.entries(finalTypeCounts).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count} coupons`);
  });
  
  // Check for any remaining invalid types
  const remainingInvalid = Object.keys(finalTypeCounts).filter(type => !validTypes.includes(type));
  
  if (remainingInvalid.length > 0) {
    console.log(`\\n❌ Migration incomplete. Still found invalid types: ${remainingInvalid}`);
    process.exit(1);
  } else {
    console.log('\\n🎉 SUCCESS: All coupon types are now valid (percent or fixed)!');
    console.log(`✅ Fixed ${totalUpdated} invalid coupon type${totalUpdated !== 1 ? 's' : ''}`);
    process.exit(0);
  }
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error(error);
  process.exit(1);
}