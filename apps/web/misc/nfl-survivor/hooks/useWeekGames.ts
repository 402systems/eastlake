import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import type { Game, Pick } from '../lib/types';

export interface PickWithUsername extends Pick {
  username: string;
}

/**
 * Loads a week's games plus every pick RLS allows the current user to see:
 * their own (always) and everyone else's for games that have already kicked off.
 * The per-game reveal rule is enforced entirely by the `picks` RLS policies —
 * this hook just renders whatever Postgres hands back.
 */
export function useWeekGames(weekId: string | null) {
  const [games, setGames] = useState<Game[]>([]);
  const [picks, setPicks] = useState<PickWithUsername[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!weekId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();

      const [{ data: gamesData }, { data: picksData }] = await Promise.all([
        supabase
          .from('games')
          .select('*')
          .eq('week_id', weekId)
          .order('kickoff_time', { ascending: true }),
        supabase
          .from('picks')
          .select('*, league_members(username)')
          .eq('week_id', weekId),
      ]);

      setGames((gamesData as Game[]) ?? []);
      type Row = Pick & { league_members: { username: string } | null };
      setPicks(
        ((picksData ?? []) as unknown as Row[]).map((row) => ({
          ...row,
          username: row.league_members?.username ?? 'Unknown',
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [weekId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { games, picks, isLoading, reload };
}
