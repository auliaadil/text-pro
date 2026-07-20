import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (import.meta.env.DEV && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('TextPro: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
