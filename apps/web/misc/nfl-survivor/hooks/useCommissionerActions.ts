import { useCallback, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { League, LeagueMember, Week } from '../lib/types';

export function useCommissionerActions(leagueId: string) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setIsBusy(true);
      setError(null);
      try {
        return await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    []
  );

  const getInviteCode = useCallback(
    () =>
      run(() =>
        apiFetch<{ invite_code: string }>(`/leagues/${leagueId}/invite`)
      ),
    [leagueId, run]
  );

  const regenerateInviteCode = useCallback(
    () =>
      run(() =>
        apiFetch<{ invite_code: string }>(`/leagues/${leagueId}/invite`, {
          method: 'POST',
        })
      ),
    [leagueId, run]
  );

  const addSimulatedMembers = useCallback(
    (usernames: string[]) =>
      run(() =>
        apiFetch<LeagueMember[]>(`/leagues/${leagueId}/members/simulated`, {
          method: 'POST',
          body: JSON.stringify({ usernames }),
        })
      ),
    [leagueId, run]
  );

  const removeMember = useCallback(
    (memberId: string) =>
      run(() =>
        apiFetch<null>(`/leagues/${leagueId}/members/${memberId}`, {
          method: 'DELETE',
        })
      ),
    [leagueId, run]
  );

  const syncSchedule = useCallback(
    () =>
      run(() =>
        apiFetch<{ synced: boolean; weeks_created: number }>(
          '/admin/sync-schedule',
          {
            method: 'POST',
            body: JSON.stringify({ league_id: leagueId }),
          }
        )
      ),
    [leagueId, run]
  );

  const syncScores = useCallback(
    () =>
      run(() =>
        apiFetch<{ synced: boolean }>('/admin/sync-scores', {
          method: 'POST',
          body: JSON.stringify({ league_id: leagueId }),
        })
      ),
    [leagueId, run]
  );

  const simulateWeek = useCallback(
    () =>
      run(() =>
        apiFetch<{ resolved: unknown[] }>(
          `/leagues/${leagueId}/simulate-week`,
          { method: 'POST' }
        )
      ),
    [leagueId, run]
  );

  const advanceWeek = useCallback(
    () =>
      run(() =>
        apiFetch<{ current_week: Week }>(`/leagues/${leagueId}/advance-week`, {
          method: 'POST',
        })
      ),
    [leagueId, run]
  );

  const generatePlayoffs = useCallback(
    () =>
      run(() =>
        apiFetch<{ rounds: unknown[] }>(
          `/leagues/${leagueId}/playoffs/generate`,
          { method: 'POST' }
        )
      ),
    [leagueId, run]
  );

  return {
    isBusy,
    error,
    getInviteCode,
    regenerateInviteCode,
    addSimulatedMembers,
    removeMember,
    syncSchedule,
    syncScores,
    simulateWeek,
    advanceWeek,
    generatePlayoffs,
  };
}

/** Create/join don't require an existing league membership, unlike the commissioner actions above. */
export function useLeagueActions() {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | null> => {
      setIsBusy(true);
      setError(null);
      try {
        return await fn();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    []
  );

  const createLeague = useCallback(
    (body: {
      name: string;
      season_year: number;
      is_simulation: boolean;
      username: string;
    }) =>
      run(() =>
        apiFetch<{ league: League; member: LeagueMember }>('/leagues', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      ),
    [run]
  );

  const joinLeague = useCallback(
    (body: { invite_code: string; username: string }) =>
      run(() =>
        apiFetch<{ league: League; member: LeagueMember }>('/leagues/join', {
          method: 'POST',
          body: JSON.stringify(body),
        })
      ),
    [run]
  );

  return { isBusy, error, createLeague, joinLeague };
}
