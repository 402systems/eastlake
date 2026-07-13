import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import type { WeekPhase } from '../lib/types';

/** Teams a member has already picked during the given phase (regular/playoff) — resets at playoffs. */
export function useUsedTeams(
  leagueMemberId: string | null,
  phase: WeekPhase | null
) {
  const [usedTeamCodes, setUsedTeamCodes] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    if (!leagueMemberId || !phase) return;
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('picks')
        .select('team_code')
        .eq('league_member_id', leagueMemberId)
        .eq('phase', phase);
      setUsedTeamCodes(
        new Set((data ?? []).map((row) => row.team_code as string))
      );
    } finally {
      // no cleanup — try/finally kept for consistency with this app's other reload() hooks
    }
  }, [leagueMemberId, phase]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { usedTeamCodes, reload };
}
