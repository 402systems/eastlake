import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@eastlake/lib-core-supabase-auth/web/client';
import type { LeagueMember } from '../lib/types';

export function useMembers(leagueId: string | null) {
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!leagueId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId)
        .order('joined_at', { ascending: true });
      setMembers((data as LeagueMember[]) ?? []);
    } finally {
      setIsLoading(false);
    }
  }, [leagueId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { members, isLoading, reload };
}
