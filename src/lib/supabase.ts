import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
      return null as any;
    }
    client = createClient(url, key, {
      auth: { persistSession: true, storageKey: 'blom-admin-auth' }
    });
  }
  return client;
})();

