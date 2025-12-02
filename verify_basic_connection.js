#!/usr/bin/env node

/**
 * Simple Stock System Verification
 * Tests the database functions without requiring Step 1 (SQL setup) to be completed first
 */

import { createClient } from '@supabase/supabase-js';

// Try to load credentials from .env file
import { readFileSync } from 'fs';

let SUPABASE_URL, SERVICE_ROLE_KEY;

try {
  const envContent = readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    if (line.startsWith('SUPABASE_URL=')) {
      SUPABASE_URL = line.split('=')[1].trim();
    } else if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      SERVICE_ROLE_KEY = line.split('=')[1].trim();
    }
  });
} catch (err) {
  console.log('⚠️ Could not read .env file, using fallback values');
}

// Fallback to hardcoded values if env file fails
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.log('Using fallback Supabase credentials...');
  SUPABASE_URL = 'https://yvmnedjybrpvlupygusf.supabase.co';
  SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';
}

console.log('🔍 Stock System Verification Starting...\n');
console.log(`📡 URL: ${SUPABASE_URL}`);
console.log(`🔑 Key: ${SERVICE_ROLE_KEY.substring(0, 20)}... (${SERVICE_ROLE_KEY.length} chars)\n`);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testBasicConnection() {
  console.log('🔌 Testing Basic Database Connection...');
  
  try {
    const { data, error } = await supabase.from('products').select('id, name').limit(1);
    
    if (error) {
      if (error.message.includes('Invalid API key')) {
        console.log('❌ Invalid API Key - Check your SUPABASE_SERVICE_ROLE_KEY');
        return false;
      } else if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log('⚠️ Connection OK, but products table not found');
        return true;
      } else {
        console.log(`❌ Database Error: ${error.message}`);
        return false;
      }
    } else {
      console.log('✅ Basic connection successful');
      return true;
    }
  } catch (err) {
    console.log(`❌ Connection Failed: ${err.message}`);
    return false;
  }
}

async function testDatabaseFunctions() {
  console.log('\n🧪 Testing Database Functions...');
  
  // Test if functions exist by calling them
  const functions = ['adjust_stock', 'log_stock_movement', 'find_product_match'];
  
  for (const func of functions) {
    try {
      const { data, error } = await supabase.rpc(func, { test: 'dummy' });
      
      if (error) {
        if (error.message.includes('does not exist') || error.message.includes('undefined')) {
          console.log(`❌ Function ${func} not found`);
        } else {
          console.log(`⚠️ Function ${func} exists but error: ${error.message}`);
        }
      } else {
        console.log(`✅ Function ${func} exists and callable`);
      }
    } catch (err) {
      console.log(`❌ Function ${func} test failed: ${err.message}`);
    }
  }
}

async function testStockMovements() {
  console.log('\n📊 Testing Stock Movements Table...');
  
  try {
    const { data, error } = await supabase.from('stock_movements').select('id').limit(1);
    
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('❌ stock_movements table does not exist - Run Step 1 SQL first');
        return false;
      } else {
        console.log(`⚠️ stock_movements table error: ${error.message}`);
        return false;
      }
    } else {
      console.log('✅ stock_movements table exists and accessible');
      
      // Check count
      const { count } = await supabase.from('stock_movements').select('*', { count: 'exact', head: true });
      console.log(`📊 Total movements: ${count || 0}`);
      return true;
    }
  } catch (err) {
    console.log(`❌ stock_movements test failed: ${err.message}`);
    return false;
  }
}

async function runVerification() {
  const connectionOK = await testBasicConnection();
  
  if (!connectionOK) {
    console.log('\n❌ BASIC CONNECTION FAILED');
    console.log('\n💡 Troubleshooting:');
    console.log('1. Check your .env file has correct SUPABASE_SERVICE_ROLE_KEY');
    console.log('2. Verify the service role key is valid in Supabase Dashboard');
    console.log('3. Ensure the key has proper permissions');
    return;
  }
  
  await testDatabaseFunctions();
  await testStockMovements();
  
  console.log('\n🎯 VERIFICATION SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Database connection working');
  console.log('❓ Check if database functions exist (may need Step 1 SQL)');
  console.log('❓ Check if stock_movements table exists (may need Step 1 SQL)');
  console.log('\n💡 NEXT STEPS:');
  console.log('1. If functions/table missing: Run Step 1 SQL in Supabase Editor');
  console.log('2. If everything exists: Run the original verify_stock_fix.js script');
  console.log('3. Check frontend for stock movements at: Admin > Stock > Movements');
}

runVerification().catch(console.error);