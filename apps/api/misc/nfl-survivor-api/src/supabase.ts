import { createClient } from '@supabase/supabase-js';
import type { Env } from './types';

// Do NOT add a service-role client here. An earlier version of this worker used one
// for privileged writes (league creation, ESPN sync, simulate-week, etc.), but a
// service-role key bypasses RLS on every table in this shared Supabase project, not
// just nfl-survivor's — a much bigger blast radius than this app needs, and inconsistent
// with friend-tracker-api's pure JWT-forwarding convention. Every privileged action here
// is instead authorized by commissioner-scoped RLS policies (is_league_commissioner() —
// see apps/api/misc/nfl-survivor-api/sql/schema.sql) or, for the one case RLS can't
// express (looking up a league by invite code before the caller is a member), the
// narrow SECURITY DEFINER function join_league(). If a new feature seems to need a
// service-role key, it almost certainly means a new commissioner-scoped RLS policy or
// SECURITY DEFINER function is missing — add that instead.

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
