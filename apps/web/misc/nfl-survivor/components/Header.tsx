import Link from 'next/link';
import { UserMenu } from './UserMenu';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  user: User | null;
  loading: boolean;
  onSignIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  onSignUp: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;
  onSignOut: () => void;
}

export function Header({
  user,
  loading,
  onSignIn,
  onSignUp,
  onSignOut,
}: HeaderProps) {
  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-slate-900"
        >
          🏈 NFL Survivor
        </Link>
        <UserMenu
          user={user}
          loading={loading}
          onSignIn={onSignIn}
          onSignUp={onSignUp}
          onSignOut={onSignOut}
        />
      </div>
    </div>
  );
}
