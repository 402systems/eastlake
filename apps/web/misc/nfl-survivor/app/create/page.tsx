'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@eastlake/lib-core-supabase-auth/web/hooks/useAuth';
import { useLeagueActions } from '../../hooks/useCommissionerActions';
import { Header } from '../../components/Header';
import { Button } from '@eastlake/lib-core-ui/components/ui/button';
import { Input } from '@eastlake/lib-core-ui/components/ui/input';
import { Label } from '@eastlake/lib-core-ui/components/ui/label';
import {
  Alert,
  AlertDescription,
} from '@eastlake/lib-core-ui/components/ui/alert';

export default function CreateLeaguePage() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { createLeague, isBusy, error } = useLeagueActions();
  const router = useRouter();

  const [name, setName] = useState('');
  const [seasonYear, setSeasonYear] = useState(
    new Date().getFullYear().toString()
  );
  const [username, setUsername] = useState('');
  const [isSimulation, setIsSimulation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await createLeague({
      name,
      season_year: Number(seasonYear),
      is_simulation: isSimulation,
      username,
    });
    if (result) router.push(`/league?id=${result.league.id}`);
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

      <div className="w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">
          Create a league
        </h1>

        {!user && !loading && (
          <p className="text-slate-500">Sign in first to create a league.</p>
        )}

        {user && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">League name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="season">Season year</Label>
              <Input
                id="season"
                type="number"
                value={seasonYear}
                onChange={(e) => setSeasonYear(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Your username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={isSimulation}
                onChange={(e) => setIsSimulation(e.target.checked)}
              />
              Simulation mode (test solo before friends join — lets you
              fast-forward weeks with random results)
            </label>

            <Button type="submit" disabled={isBusy} className="w-full">
              {isBusy ? 'Creating…' : 'Create league'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
