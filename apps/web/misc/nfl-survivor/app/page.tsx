'use client';

import Link from 'next/link';
import { useAuth } from '@eastlake/lib-core-supabase-auth/web/hooks/useAuth';
import { useLeagueMemberships } from '../hooks/useLeagueMemberships';
import { Header } from '../components/Header';
import { Button } from '@eastlake/lib-core-ui/components/ui/button';
import { Skeleton } from '@eastlake/lib-core-ui/components/ui/skeleton';

export default function HomePage() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { memberships, isLoading } = useLeagueMemberships(user, loading);

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-slate-50 p-4 sm:gap-8 sm:p-8">
      <Header
        user={user}
        loading={loading}
        onSignIn={signIn}
        onSignUp={signUp}
        onSignOut={signOut}
      />

      <div className="w-full max-w-3xl space-y-4">
        {!user && !loading && (
          <p className="text-center text-slate-500">
            Sign in to see your leagues, or create/join one below.
          </p>
        )}

        {user && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-700">
                Your leagues
              </h2>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/join">Join a league</Link>
                </Button>
                <Button asChild>
                  <Link href="/create">Create a league</Link>
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : memberships.length === 0 ? (
              <p className="text-slate-500">
                You&apos;re not in any leagues yet. Create one, or join with an
                invite code.
              </p>
            ) : (
              <div className="space-y-3">
                {memberships.map((m) => (
                  <Link
                    key={m.league_id}
                    href={`/league?id=${m.league_id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900">
                        {m.league_name}
                      </span>
                      {m.is_commissioner && (
                        <span className="text-xs text-slate-500">
                          Commissioner
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
