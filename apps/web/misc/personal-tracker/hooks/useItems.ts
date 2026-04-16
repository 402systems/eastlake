import { useState, useCallback, useEffect } from 'react';
import type React from 'react';
import { createClient } from '@402systems/lib-core-supabase-auth/web/client';
import type { User } from '@supabase/supabase-js';
import { config } from '../tracker.config';

export interface Item {
  id: string;
  name: string;
  last_action: string | null;
  created_at: string;
}

export function getDaysSince(lastAction: string | null): number {
  if (!lastAction) return 999; // never = max urgency
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(lastAction + 'T00:00:00'); // local midnight, avoids UTC off-by-one
  return Math.max(
    0,
    Math.floor((today.getTime() - last.getTime()) / 86_400_000)
  );
}

export function getItemStyles(days: number): React.CSSProperties {
  const c = Math.min(days, 14);
  const fontSize = Math.round(16 + (c / 14) * 32); // 16px → 48px
  const fontWeight = c < 3 ? 400 : c < 7 ? 500 : c < 10 ? 600 : 700;
  const hue = c < 7 ? 215 : Math.round(215 - ((c - 7) / 7) * 195); // slate → red-orange
  const sat = c < 3 ? 15 : Math.round(15 + ((c - 3) / 11) * 75);
  const lit = c < 3 ? 40 : Math.round(40 - ((c - 3) / 11) * 10);
  return {
    fontSize: `${fontSize}px`,
    fontWeight,
    color: `hsl(${hue}, ${sat}%, ${lit}%)`,
    transition: 'font-size 0.3s ease, color 0.3s ease',
    lineHeight: '1.2',
  };
}

interface UseItemsProps {
  user: User | null;
  loading: boolean;
}

export function useItems({ user, loading }: UseItemsProps) {
  const [supabase, setSupabase] = useState<ReturnType<
    typeof createClient
  > | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Supabase client on mount (client-side only)
  useEffect(() => {
    setSupabase(createClient());
  }, []);

  const loadItems = useCallback(async () => {
    if (!user?.id || !supabase) return;

    setIsLoadingItems(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from(config.tableName)
        .select('id, name, last_action, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setItems(data ?? []);
    } catch (err) {
      console.error('Failed to load items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setIsLoadingItems(false);
    }
  }, [user, supabase]);

  const addItem = useCallback(
    async (name: string) => {
      if (!user?.id || !supabase) return;

      const { data, error: insertError } = await supabase
        .from(config.tableName)
        .insert({ user_id: user.id, name })
        .select('id, name, last_action, created_at')
        .single();

      if (insertError) {
        console.error('Failed to add item:', insertError);
        setError('Failed to add item. Please try again.');
        return;
      }

      if (data) {
        setItems((prev) => [...prev, data]);
      }
    },
    [user, supabase]
  );

  const recordAction = useCallback(
    async (itemId: string) => {
      if (!user?.id || !supabase) return;

      const today = new Date().toISOString().split('T')[0];

      const { error: updateError } = await supabase
        .from(config.tableName)
        .update({ last_action: today })
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to record action:', updateError);
        setError('Failed to update. Please try again.');
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, last_action: today } : item
        )
      );
    },
    [user, supabase]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (!user?.id || !supabase) return;

      const { error: deleteError } = await supabase
        .from(config.tableName)
        .delete()
        .eq('id', itemId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Failed to delete item:', deleteError);
        setError('Failed to delete item. Please try again.');
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== itemId));
    },
    [user, supabase]
  );

  // Load items when user authenticates
  useEffect(() => {
    if (user && !loading) {
      loadItems();
    }
    if (!user) {
      setItems([]);
    }
  }, [user, loading, loadItems]);

  // Sort by urgency: most days first (null last_action = Infinity)
  const sortedItems = [...items].sort((a, b) => {
    const daysA =
      a.last_action === null ? Infinity : getDaysSince(a.last_action);
    const daysB =
      b.last_action === null ? Infinity : getDaysSince(b.last_action);
    return daysB - daysA;
  });

  return {
    items: sortedItems,
    isLoadingItems,
    error,
    addItem,
    recordAction,
    deleteItem,
  };
}
