import { useState, useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { api } from '../api/client';
import { config } from '../tracker.config';

export interface Friend {
  id: string;
  name: string;
  last_action: string | null;
  phone_number: string | null;
  birthday: string | null;
  groups: string[];
  created_at: string;
}

export interface NewFriend {
  name: string;
  phone_number?: string | null;
  birthday?: string | null;
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

/** Returns an urgency color for the accent strip and name text */
export function getUrgencyColor(days: number): string {
  if (days >= 999) return '#dc2626'; // red — never
  if (days >= config.urgencyThresholds.overdue) return '#dc2626';
  if (days >= config.urgencyThresholds.soon) return '#f97316';
  if (days >= config.urgencyThresholds.checkin) return '#eab308';
  return '#22c55e'; // green — recent
}

interface UseFriendsProps {
  user: User | null;
  loading: boolean;
}

export function useFriends({ user, loading }: UseFriendsProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user?.id) return;

    setIsLoadingFriends(true);
    setError(null);
    try {
      const data = await api.get<Friend[]>('/friends');
      setFriends(data ?? []);
    } catch (err) {
      console.error('Failed to load friends:', err);
      setError('Failed to load friends. Please try again.');
    } finally {
      setIsLoadingFriends(false);
    }
  }, [user]);

  const addFriend = useCallback(
    async (friend: NewFriend) => {
      if (!user?.id) return;

      try {
        const data = await api.post<Friend>('/friends', friend);
        if (data) setFriends((prev) => [...prev, data]);
      } catch (err) {
        console.error('Failed to add friend:', err);
        setError('Failed to add friend. Please try again.');
      }
    },
    [user]
  );

  const recordHangout = useCallback(
    async (friendId: string) => {
      if (!user?.id) return;

      try {
        const { last_action } = await api.post<{ last_action: string }>(
          `/friends/${friendId}/hangout`
        );
        setFriends((prev) =>
          prev.map((f) => (f.id === friendId ? { ...f, last_action } : f))
        );
      } catch (err) {
        console.error('Failed to record hangout:', err);
        setError('Failed to update. Please try again.');
      }
    },
    [user]
  );

  const deleteFriend = useCallback(
    async (friendId: string) => {
      if (!user?.id) return;

      try {
        await api.delete(`/friends/${friendId}`);
        setFriends((prev) => prev.filter((f) => f.id !== friendId));
      } catch (err) {
        console.error('Failed to delete friend:', err);
        setError('Failed to delete. Please try again.');
      }
    },
    [user]
  );

  useEffect(() => {
    if (user && !loading) loadFriends();
    if (!user) setFriends([]);
  }, [user, loading, loadFriends]);

  // Sort by urgency: most overdue first (null last_action = Infinity)
  const sortedFriends = [...friends].sort((a, b) => {
    const daysA =
      a.last_action === null ? Infinity : getDaysSince(a.last_action);
    const daysB =
      b.last_action === null ? Infinity : getDaysSince(b.last_action);
    return daysB - daysA;
  });

  return {
    friends: sortedFriends,
    isLoadingFriends,
    error,
    addFriend,
    recordHangout,
    deleteFriend,
    setFriends,
  };
}
