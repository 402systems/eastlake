'use client';

import { useState } from 'react';
import { useAuth } from '@402systems/lib-core-supabase-auth/web/hooks/useAuth';
import { useItems } from '../hooks/useItems';
import { Header } from '../components/Header';
import { ItemCard } from '../components/ItemCard';
import { AddItemDialog } from '../components/AddItemDialog';
import { config } from '../tracker.config';
import { Button } from '@402systems/core-ui/components/ui/button';
import { Skeleton } from '@402systems/core-ui/components/ui/skeleton';
import {
  Alert,
  AlertDescription,
} from '@402systems/core-ui/components/ui/alert';
import { TooltipProvider } from '@402systems/core-ui/components/ui/tooltip';
import { UserPlus } from 'lucide-react';

export default function PersonalTrackerPage() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { items, isLoadingItems, error, addItem, recordAction, deleteItem } =
    useItems({ user, loading });
  const [dialogOpen, setDialogOpen] = useState(false);

  const { singular, plural } = config.itemNoun;

  return (
    <TooltipProvider>
      <div className="flex min-h-screen flex-col items-center gap-6 bg-slate-50 p-4 sm:gap-8 sm:p-8">
        <Header
          user={user}
          loading={loading}
          onSignIn={signIn}
          onSignUp={signUp}
          onSignOut={signOut}
        />

        <div className="w-full max-w-2xl space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!user && !loading && (
            <p className="text-center text-slate-500">
              Sign in to start tracking.
            </p>
          )}

          {user && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-700">
                  {items.length === 0 && !isLoadingItems
                    ? `No ${plural} added yet`
                    : `${items.length} ${items.length !== 1 ? plural : singular}`}
                </h2>
                <Button onClick={() => setDialogOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Add {singular}
                </Button>
              </div>

              {isLoadingItems ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      onAction={recordAction}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <AddItemDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAdd={addItem}
        />
      </div>
    </TooltipProvider>
  );
}
