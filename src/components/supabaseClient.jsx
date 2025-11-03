// Unified Supabase client (singleton) + write guard
import { supabase as singletonSupabase } from '@/lib/supabase';
import { guardClientWrites } from '@/lib/blockClientWrites';

export const supabase = singletonSupabase;

if (typeof window !== 'undefined' && supabase) {
  guardClientWrites(supabase);
}
