import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      'Supabase URL or Key is missing. Returning a dummy client for build/SSR.'
    );
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder'
    );
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};
