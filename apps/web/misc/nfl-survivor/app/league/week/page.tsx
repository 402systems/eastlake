'use client';

import { Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@eastlake/lib-core-supabase-auth/web/hooks/useAuth';
import { useLeague } from '../../../hooks/useLeague';
import { useWeeks } from '../../../hooks/useWeeks';
import { useWeekGames } from '../../../hooks/useWeekGames';
import { usePicks } from '../../../hooks/usePicks';
import { useUsedTeams } from '../../../hooks/useUsedTeams';
import { Header } from '../../../components/Header';
import { LeagueBadge } from '../../../components/LeagueBadge';
import { WeekSelector } from '../../../components/WeekSelector';
import { GameCard } from '../../../components/GameCard';
import { Skeleton } from '@eastlake/lib-core-ui/components/ui/skeleton';
import {
  Alert,
  AlertDescription,
} from '@eastlake/lib-core-ui/components/ui/alert';
import { Badge } from '@eastlake/lib-core-ui/components/ui/badge';

function WeekContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const leagueId = searchParams.get('id');
  const weekId = searchParams.get('week');

  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { league, myMembership } = useLeague(leagueId, user, loading);
  const { weeks } = useWeeks(leagueId);
  const {
    games,
    picks,
    isLoading: gamesLoading,
    reload: reloadGames,
  } = useWeekGames(weekId);
  const { submitPick, isSubmitting, error } = usePicks();

  const currentWeek = useMemo(
    () => weeks.find((w) => w.id === weekId) ?? null,
    [weeks, weekId]
  );
  const { usedTeamCodes, reload: reloadUsedTeams } = useUsedTeams(
    myMembership?.id ?? null,
    currentWeek?.phase ?? null
  );

  const myPick = picks.find((p) => p.league_member_id === myMembership?.id);

  function selectWeek(newWeekId: string) {
    router.push(`/league/week?id=${leagueId}&week=${newWeekId}`);
  }

  async function handlePick(gameId: string, teamCode: string) {
    if (!myMembership || !currentWeek) return;
    const result = await submitPick({
      leagueMemberId: myMembership.id,
      weekId: currentWeek.id,
      gameId,
      teamCode,
      phase: currentWeek.phase,
    });
    if (!result.error) {
      reloadGames();
      reloadUsedTeams();
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-slate-50 p-4 sm:gap-8 sm:p-8">
      <Header
        user={user}
        loading={loading}
        onSignIn={signIn}
        onSignUp={signUp}
        onSignOut={signOut}
      />

      <div className="w-full max-w-3xl space-y-6">
        {league && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">
                {league.name}
              </h1>
              <LeagueBadge isSimulation={league.is_simulation} />
            </div>
            <WeekSelector
              weeks={weeks}
              selectedWeekId={weekId}
              currentWeekId={league.current_week_id}
              onSelect={selectWeek}
            />
          </div>
        )}

        {!weekId && (
          <p className="text-slate-500">Select a week to see the schedule.</p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {myPick && (
          <p className="text-sm text-slate-600">
            Your pick this week: <Badge>{myPick.team_code}</Badge>
          </p>
        )}

        {weekId && gamesLoading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        )}

        {weekId && !gamesLoading && (
          <div className="space-y-3">
            {games.length === 0 && (
              <p className="text-slate-500">
                No games synced for this week yet
                {myMembership?.is_commissioner
                  ? ' — use the commissioner panel to sync the schedule.'
                  : '.'}
              </p>
            )}
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                myPick={myPick}
                otherPicks={picks.filter(
                  (p) =>
                    p.game_id === game.id &&
                    p.league_member_id !== myMembership?.id
                )}
                usedTeamCodes={usedTeamCodes}
                onPick={(teamCode) => handlePick(game.id, teamCode)}
                isSubmitting={isSubmitting}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeekPage() {
  return (
    <Suspense fallback={null}>
      <WeekContent />
    </Suspense>
  );
}
