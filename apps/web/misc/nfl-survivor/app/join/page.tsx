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

export default function JoinLeaguePage() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { joinLeague, isBusy, error } = useLeagueActions();
  const router = useRouter();

  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await joinLeague({
      invite_code: inviteCode.trim().toUpperCase(),
      username: username.trim(),
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
        <h1 className="text-xl font-semibold text-slate-900">Join a league</h1>

        {!user && !loading && (
          <p className="text-slate-500">
            Sign in first, then enter your invite code.
          </p>
        )}

        {user && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="code">Invite code</Label>
              <Input
                id="code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                className="uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="username">Choose a username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <p className="text-xs text-slate-500">
                If the commissioner already reserved this name for you,
                you&apos;ll claim that seat.
              </p>
            </div>

            <Button type="submit" disabled={isBusy} className="w-full">
              {isBusy ? 'Joining…' : 'Join league'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
