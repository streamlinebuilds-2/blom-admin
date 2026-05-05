
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yvmnedjybrpvlupygusf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdWx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 Running database migration to fix product status constraint...');

  const sql = `
    -- Drop the existing constraint
    ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;

    -- Add the updated constraint that includes 'deleted'
    ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('active', 'draft', 'archived', 'deleted', 'published'));

    -- Also check the bundles table status constraint
    ALTER TABLE bundles DROP CONSTRAINT IF EXISTS bundles_status_check;
    ALTER TABLE bundles ADD CONSTRAINT bundles_status_check 
    CHECK (status IN ('active', 'draft', 'archived', 'deleted', 'published'));

    -- Create index on status for better filtering performance
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_bundles_status ON bundles(status);
  `;

  try {
    // Try to use exec_sql RPC if it exists
    console.log('📡 Attempting to run SQL via exec_sql RPC...');
    const { data, error } = await admin.rpc('exec_sql', { 
      query: sql 
    });

    if (error) {
      console.error('❌ RPC exec_sql failed:', error.message);
      console.log('💡 Note: If this fails, you may need to run the SQL manually in the Supabase SQL Editor.');
      
      // Try alternate RPC name if 'exec_sql' is not right (some systems use 'run_sql')
      console.log('📡 Trying alternate RPC name "run_sql"...');
      const { data: data2, error: error2 } = await admin.rpc('run_sql', { 
        sql: sql 
      });
      
      if (error2) {
        console.error('❌ RPC run_sql also failed:', error2.message);
      } else {
        console.log('✅ Migration successful via run_sql!');
      }
    } else {
      console.log('✅ Migration successful via exec_sql!');
    }
  } catch (err) {
    console.error('💥 Unexpected error:', err.message);
  }
}

runMigration();
