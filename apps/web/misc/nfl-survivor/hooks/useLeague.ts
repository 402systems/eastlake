import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import type { User } from '@supabase/supabase-js';
import type { League, LeagueMember } from '../lib/types';

export function useLeague(
  leagueId: string | null,
  user: User | null,
  loading: boolean
) {
  const [league, setLeague] = useState<League | null>(null);
  const [myMembership, setMyMembership] = useState<LeagueMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!leagueId || loading || !user) return;
    setIsLoading(true);
    try {
      const supabase = createClient();

      const [{ data: leagueData }, { data: memberData }] = await Promise.all([
        supabase.from('leagues').select('*').eq('id', leagueId).single(),
        supabase
          .from('league_members')
          .select('*')
          .eq('league_id', leagueId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      setLeague((leagueData as League) ?? null);
      setMyMembership((memberData as LeagueMember) ?? null);
    } finally {
      setIsLoading(false);
    }
  }, [leagueId, user, loading]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { league, myMembership, isLoading, reload };
}
