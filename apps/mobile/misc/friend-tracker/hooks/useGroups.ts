import { useState, useMemo, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Friend } from './useFriends';
import { api } from '../api/client';

interface UseGroupsProps {
  user: User | null;
  friends: Friend[];
}

export function useGroups({ user, friends }: UseGroupsProps) {
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Derive group names from friend arrays
  const groups = useMemo(
    () => [...new Set(friends.flatMap((f) => f.groups ?? []))].sort(),
    [friends]
  );

  const addFriendToGroup = useCallback(
    async (friendId: string, groupName: string): Promise<string[] | null> => {
      if (!user?.id) return null;

      try {
        const { groups } = await api.put<{ groups: string[] }>(
          `/friends/${friendId}/groups/${encodeURIComponent(groupName)}`
        );
        return groups;
      } catch (err) {
        console.error('Failed to add friend to group:', err);
        return null;
      }
    },
    [user]
  );

  const removeFriendFromGroup = useCallback(
    async (friendId: string, groupName: string): Promise<string[] | null> => {
      if (!user?.id) return null;

      try {
        const { groups } = await api.delete<{ groups: string[] }>(
          `/friends/${friendId}/groups/${encodeURIComponent(groupName)}`
        );
        return groups;
      } catch (err) {
        console.error('Failed to remove friend from group:', err);
        return null;
      }
    },
    [user]
  );

  const deleteGroup = useCallback(
    async (groupName: string): Promise<string | undefined> => {
      if (!user?.id) return;

      try {
        await api.delete(`/groups/${encodeURIComponent(groupName)}`);
        if (activeGroup === groupName) setActiveGroup(null);
        return groupName;
      } catch (err) {
        console.error('Failed to delete group:', err);
        return undefined;
      }
    },
    [user, activeGroup]
  );

  return {
    groups,
    activeGroup,
    setActiveGroup,
    addFriendToGroup,
    removeFriendFromGroup,
    deleteGroup,
  };
}
