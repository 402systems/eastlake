import { createClient } from '@supabase/supabase-js';
import type { Env } from './types';

/** Client scoped to the request's user via RLS — forwards their JWT, does not bypass policies. */
export function createSupabaseClient(env: Env, accessToken: string) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
