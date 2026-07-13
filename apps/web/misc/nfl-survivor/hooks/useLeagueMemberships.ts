import { useEffect, useState } from 'react';
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import type { User } from '@supabase/supabase-js';

export interface MembershipSummary {
  league_id: string;
  league_name: string;
  is_commissioner: boolean;
}

export function useLeagueMemberships(user: User | null, loading: boolean) {
  const [memberships, setMemberships] = useState<MembershipSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    async function load() {
      if (!user) {
        setMemberships([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('league_members')
          .select('league_id, is_commissioner, leagues(name)')
          .eq('user_id', user.id);
        if (cancelled) return;

        type Row = {
          league_id: string;
          is_commissioner: boolean;
          leagues: { name: string } | null;
        };
        setMemberships(
          ((data ?? []) as unknown as Row[]).map((row) => ({
            league_id: row.league_id,
            is_commissioner: row.is_commissioner,
            league_name: row.leagues?.name ?? 'Unknown league',
          }))
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  return { memberships, isLoading };
}
