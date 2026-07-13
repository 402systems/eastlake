'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@eastlake/lib-core-supabase-auth/web/hooks/useAuth';
import { useLeague } from '../../hooks/useLeague';
import { useStandings } from '../../hooks/useStandings';
import { Header } from '../../components/Header';
import { LeagueBadge } from '../../components/LeagueBadge';
import { StandingsTable } from '../../components/StandingsTable';
import { Button } from '@eastlake/lib-core-ui/components/ui/button';
import { Skeleton } from '@eastlake/lib-core-ui/components/ui/skeleton';

function LeagueContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('id');
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const {
    league,
    myMembership,
    isLoading: leagueLoading,
  } = useLeague(leagueId, user, loading);
  const { standings, isLoading: standingsLoading } = useStandings(leagueId);

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
        {!leagueId && <p className="text-slate-500">No league selected.</p>}

        {leagueId && leagueLoading && (
          <Skeleton className="h-24 w-full rounded-lg" />
        )}

        {leagueId && !leagueLoading && !league && (
          <p className="text-slate-500">
            League not found, or you&apos;re not a member.
          </p>
        )}

        {league && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {league.name}
                </h1>
                <LeagueBadge isSimulation={league.is_simulation} />
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link
                    href={`/league/week?id=${league.id}${league.current_week_id ? `&week=${league.current_week_id}` : ''}`}
                  >
                    This week
                  </Link>
                </Button>
                {myMembership?.is_commissioner && (
                  <Button asChild variant="outline">
                    <Link href={`/league/commissioner?id=${league.id}`}>
                      Commissioner
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            {standingsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-40 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                <StandingsTable
                  title="Win Points"
                  rows={standings}
                  points="win_points"
                />
                <StandingsTable
                  title="Loss Points"
                  rows={standings}
                  points="loss_points"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LeaguePage() {
  return (
    <Suspense fallback={null}>
      <LeagueContent />
    </Suspense>
  );
}
