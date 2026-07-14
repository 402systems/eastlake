import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_NFL_SURVIVOR_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:8787'
    : 'https://api.402systems.com/nfl-survivor');

/**
 * Calls the nfl-survivor-api worker with the current session's JWT attached.
 * Only used for privileged actions (league create/join, commissioner actions,
 * ESPN sync) — everything else reads/writes Supabase directly under RLS.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not signed in');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      (body as { error?: string })?.error ?? `Request failed: ${res.status}`
    );
  }
  return body as T;
}
