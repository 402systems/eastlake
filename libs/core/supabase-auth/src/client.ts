import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Only run on client side
  if (typeof window === 'undefined') {
    throw new Error('createClient should only be called on the client side');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY are set.'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
