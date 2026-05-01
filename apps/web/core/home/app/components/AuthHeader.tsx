'use client';

import { useAuth } from '@eastlake/lib-core-supabase-auth/web/hooks/useAuth';
import { Button } from '@eastlake/core-ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@eastlake/core-ui/components/ui/dropdown-menu';
import { AuthButtons } from '@eastlake/lib-core-supabase-auth/web/components';
import { User, LogOut, Loader2 } from 'lucide-react';

export function AuthHeader() {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <User className="h-4 w-4" />
              {user.email}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <AuthButtons onSignIn={signIn} onSignUp={signUp} />
    </div>
  );
}
