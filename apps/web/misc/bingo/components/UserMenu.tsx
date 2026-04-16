import { Button } from '@402systems/core-ui/components/ui/button';
import { User, LogOut, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@402systems/core-ui/components/ui/dropdown-menu';
import { AuthButtons } from '@402systems/lib-core-supabase-auth/web/components';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface UserMenuProps {
  user: SupabaseUser | null;
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

export function UserMenu({
  user,
  loading,
  onSignIn,
  onSignUp,
  onSignOut,
}: UserMenuProps) {
  if (loading) {
    return <Loader2 className="h-5 w-5 animate-spin text-slate-500" />;
  }

  if (user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <User className="h-4 w-4" />
            {user.email?.split('@')[0]}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut} className="gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return <AuthButtons onSignIn={onSignIn} onSignUp={onSignUp} />;
}
