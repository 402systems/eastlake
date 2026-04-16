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
    <div className="w-full max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Bingo Builder
          </h1>
          <p className="text-slate-500">Create your custom 5x5 bingo board</p>
        </div>
        <div>
          <UserMenu
            user={user}
            loading={loading}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </div>
  );
}
