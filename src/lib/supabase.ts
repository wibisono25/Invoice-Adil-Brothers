import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-url.supabase.co';

// Create a dummy client if keys are missing or invalid to prevent crash at module load
export const supabase = createClient(
  finalUrl,
  supabaseAnonKey || 'placeholder-key'
);
