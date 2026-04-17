import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null as any;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
