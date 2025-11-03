// Supabase client for external database connection
// Re-export singleton from lib/supabase
import { supabase as singletonSupabase } from '@/lib/supabase';
import { guardClientWrites } from '@/lib/blockClientWrites';

export const supabase = singletonSupabase;

if (typeof window !== 'undefined' && supabase) {
  guardClientWrites(supabase);
}
