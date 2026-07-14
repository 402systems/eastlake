import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import type { Week } from '../lib/types';

export function weekLabel(week: Week): string {
  if (week.phase === 'regular') return `Week ${week.week_number}`;
  const labels: Record<string, string> = {
    wild_card: 'Wild Card',
    divisional: 'Divisional',
    conference: 'Conference Championship',
    super_bowl: 'Super Bowl',
  };
  return labels[week.playoff_round ?? ''] ?? 'Playoffs';
}

export function useWeeks(leagueId: string | null) {
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!leagueId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('weeks')
        .select('*')
        .eq('league_id', leagueId)
        .order('sort_order', { ascending: true });
      setWeeks((data as Week[]) ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { weeks, isLoading, reload };
}
