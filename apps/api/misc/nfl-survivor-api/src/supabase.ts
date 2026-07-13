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

/**
 * Service-role client that bypasses RLS entirely. Only for routes that must write
 * games/weeks (schedule/results, service-role only by design) or that need to look
 * up state a caller isn't a league member of yet (e.g. resolving an invite code).
 * Every caller of this MUST perform its own authorization check first.
 */
export function createServiceClient(env: Env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
