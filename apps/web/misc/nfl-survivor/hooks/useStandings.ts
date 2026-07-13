import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import type { StandingsRow } from '../lib/types';

export function useStandings(leagueId: string | null) {
  const [standings, setStandings] = useState<StandingsRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!leagueId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.rpc('league_standings', {
        p_league_id: leagueId,
      });
      const rows = ((data as StandingsRow[]) ?? []).sort(
        (a, b) => b.win_points - a.win_points || a.loss_points - b.loss_points
      );
      setStandings(rows);
    } finally {
      setIsLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { standings, isLoading, reload };
}
