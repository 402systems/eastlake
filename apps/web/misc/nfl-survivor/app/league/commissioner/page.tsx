'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@eastlake/lib-core-supabase-auth/web/hooks/useAuth';
import { useLeague } from '../../../hooks/useLeague';
import { useMembers } from '../../../hooks/useMembers';
import { useCommissionerActions } from '../../../hooks/useCommissionerActions';
import { Header } from '../../../components/Header';
import { LeagueBadge } from '../../../components/LeagueBadge';
import { InviteCodeCard } from '../../../components/InviteCodeCard';
import { SimulateWeekPanel } from '../../../components/SimulateWeekPanel';
import { Button } from '@eastlake/lib-core-ui/components/ui/button';
import { Input } from '@eastlake/lib-core-ui/components/ui/input';
import {
  Alert,
  AlertDescription,
} from '@eastlake/lib-core-ui/components/ui/alert';

function CommissionerContent() {
  const searchParams = useSearchParams();
  const leagueId = searchParams.get('id');
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { league, myMembership } = useLeague(leagueId, user, loading);
  const { members, reload: reloadMembers } = useMembers(leagueId);
  const actions = useCommissionerActions(leagueId ?? '');
  const [newSimUsername, setNewSimUsername] = useState('');
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!leagueId) {
    return <p className="text-slate-500">No league selected.</p>;
  }

  const isCommissioner = myMembership?.is_commissioner ?? false;

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
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              {league.name} — Commissioner
            </h1>
            <LeagueBadge isSimulation={league.is_simulation} />
          </div>
        )}

        {!isCommissioner && (
          <p className="text-slate-500">
            Only the commissioner can access this page.
          </p>
        )}

        {isCommissioner && league && (
          <>
            {actions.error && (
              <Alert variant="destructive">
                <AlertDescription>{actions.error}</AlertDescription>
              </Alert>
            )}

            <InviteCodeCard
              getInviteCode={actions.getInviteCode}
              regenerateInviteCode={actions.regenerateInviteCode}
              isBusy={actions.isBusy}
            />

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="mb-1 font-semibold text-slate-900">
                Schedule sync
              </h3>
              <p className="mb-3 text-sm text-slate-600">
                Pull the regular season schedule (teams, matchups, kickoff
                times) from ESPN — run this once before picks or simulation can
                work, even for a simulation league (simulate-week randomizes the{' '}
                <em>results</em> of these real games, it doesn&apos;t invent a
                schedule from scratch).
              </p>
              {syncMessage && (
                <Alert className="mb-3">
                  <AlertDescription>{syncMessage}</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <Button
                  disabled={actions.isBusy}
                  onClick={async () => {
                    const res = await actions.syncSchedule();
                    if (res)
                      setSyncMessage(
                        `Synced schedule — ${res.weeks_created} new week(s) created.`
                      );
                  }}
                >
                  Sync schedule
                </Button>
                {!league.is_simulation && (
                  <Button
                    variant="outline"
                    disabled={actions.isBusy}
                    onClick={async () => {
                      const res = await actions.syncScores();
                      if (res) setSyncMessage('Scores refreshed.');
                    }}
                  >
                    Refresh scores
                  </Button>
                )}
              </div>
            </div>

            {league.is_simulation ? (
              <SimulateWeekPanel
                simulateWeek={actions.simulateWeek}
                advanceWeek={actions.advanceWeek}
                generatePlayoffs={actions.generatePlayoffs}
                isBusy={actions.isBusy}
                onChanged={reloadMembers}
              />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <Button
                  variant="ghost"
                  disabled={actions.isBusy}
                  onClick={async () => {
                    const res = await actions.generatePlayoffs();
                    if (res) setSyncMessage('Playoff weeks generated.');
                  }}
                >
                  Generate playoffs
                </Button>
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="mb-2 font-semibold text-slate-900">Members</h3>
              <ul className="mb-4 divide-y divide-slate-100">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-2 text-sm"
                  >
                    <span>
                      {m.username}
                      {m.is_commissioner && ' 👑'}
                      {!m.user_id && (
                        <span className="ml-2 text-xs text-slate-400">
                          (unclaimed)
                        </span>
                      )}
                    </span>
                    {!m.is_commissioner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={actions.isBusy}
                        onClick={async () => {
                          const res = await actions.removeMember(m.id);
                          if (res !== undefined) reloadMembers();
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>

              {league.is_simulation && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Simulated member username"
                    value={newSimUsername}
                    onChange={(e) => setNewSimUsername(e.target.value)}
                  />
                  <Button
                    disabled={actions.isBusy || !newSimUsername.trim()}
                    onClick={async () => {
                      const res = await actions.addSimulatedMembers([
                        newSimUsername.trim(),
                      ]);
                      if (res) {
                        setNewSimUsername('');
                        reloadMembers();
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CommissionerPage() {
  return (
    <Suspense fallback={null}>
      <CommissionerContent />
    </Suspense>
  );
}
