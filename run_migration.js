
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Credentials from tool output
const SUPABASE_URL = 'https://yvmnedjybrpvlupygusf.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2bW5lZGp5YnJwdmx1cHlndXNmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYwOTY0MywiZXhwIjoyMDc0MTg1NjQzfQ.dI1D3wtCcM_HwBDyT5bg_H5Yj5e0GUT2ILjDfw6gSyI';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  try {
    const sqlPath = path.resolve('SUPABASE_COURSES_SETUP.sql');
    console.log('Reading SQL from:', sqlPath);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL via exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sql
    });

    if (error) {
      console.error('Error executing SQL:', error);
      
      if (error.message.includes('function "exec_sql" does not exist') || error.code === 'PGRST202') {
         console.log('\nNOTE: The "exec_sql" function is missing in the database.');
         console.log('You need to run the SQL manually in the Supabase Dashboard SQL Editor.');
      }
      process.exit(1);
    } else {
      console.log('SQL executed successfully!');
      console.log('Result:', data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

run();
