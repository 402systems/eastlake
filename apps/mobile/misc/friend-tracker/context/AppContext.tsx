import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@eastlake/lib-core-supabase-auth/native/hooks/useAuth';
import { api } from '../api/client';
import {
  requestNotificationPermission,
  scheduleEventReminder,
  cancelEventReminder,
} from '../utils/notifications';

// ── Types ──────────────────────────────────────────────────────────────────

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

export interface EventFriend {
  friend_id: string;
}

export interface AppEvent {
  id: string;
  name: string;
  date: string;
  created_at: string;
  event_friends: EventFriend[];
}

export interface NewEvent {
  name: string;
  date: string;
}

// ── Context ────────────────────────────────────────────────────────────────

interface AppContextValue {
  // Auth
  user: User | null;
  authLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;

  // Friends
  friends: Friend[];
  isLoadingFriends: boolean;
  addFriend: (f: NewFriend) => Promise<void>;
  addFriends: (fs: NewFriend[]) => Promise<void>;
  recordHangout: (friendId: string) => Promise<void>;
  deleteFriend: (friendId: string) => Promise<void>;

  // Groups (stored on friend rows)
  addFriendToGroup: (
    friendId: string,
    groupName: string
  ) => Promise<string[] | null>;
  removeFriendFromGroup: (
    friendId: string,
    groupName: string
  ) => Promise<string[] | null>;
  deleteGroup: (groupName: string) => Promise<string | undefined>;
  updateFriendGroupsLocally: (friendId: string, groups: string[]) => void;

  // Events
  events: AppEvent[];
  isLoadingEvents: boolean;
  createEvent: (e: NewEvent) => Promise<AppEvent | null>;
  updateEvent: (id: string, e: Partial<NewEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addFriendsToEvent: (eventId: string, friendIds: string[]) => Promise<void>;
  removeFriendFromEvent: (eventId: string, friendId: string) => Promise<void>;

  refresh: () => Promise<void>;
  isRefreshing: boolean;
  error: string | null;
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();

  // null = not yet fetched; [] = fetched but empty; Friend[] = loaded
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [events, setEvents] = useState<AppEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track previous user ID to reset data when the user changes.
  // setState-during-render is the React-recommended pattern for derived state
  // resets: React re-renders immediately with the new state, no effect needed.
  const [prevUserId, setPrevUserId] = useState(user?.id);
  if (prevUserId !== user?.id) {
    setPrevUserId(user?.id);
    setFriends(null);
    setEvents(null);
  }

  const isLoadingFriends = !!user && !authLoading && friends === null;
  const isLoadingEvents = !!user && !authLoading && events === null;

  // Request notification permission once on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Load friends when user logs in
  useEffect(() => {
    if (user && !authLoading) {
      api
        .get<Friend[]>('/friends')
        .then((data) => setFriends(data ?? []))
        .catch((err) => setError(err.message));
    }
  }, [user, authLoading]);

  // Load events when user logs in
  useEffect(() => {
    if (user && !authLoading) {
      api
        .get<AppEvent[]>('/events')
        .then((data) => setEvents(data ?? []))
        .catch((err) => setError(err.message));
    }
  }, [user, authLoading]);

  // ── Friend actions ──

  const addFriend = useCallback(async (f: NewFriend) => {
    try {
      const data = await api.post<Friend>('/friends', f);
      if (data) setFriends((prev) => [...(prev ?? []), data]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add friend');
    }
  }, []);

  const addFriends = useCallback(async (fs: NewFriend[]) => {
    const failed: string[] = [];
    for (const f of fs) {
      try {
        const data = await api.post<Friend>('/friends', f);
        if (data) setFriends((prev) => [...(prev ?? []), data]);
      } catch {
        failed.push(f.name);
      }
    }
    if (failed.length > 0) {
      setError(`Failed to import: ${failed.join(', ')}`);
    }
  }, []);

  const recordHangout = useCallback(async (friendId: string) => {
    try {
      const { last_action } = await api.post<{ last_action: string }>(
        `/friends/${friendId}/hangout`
      );
      setFriends((prev) =>
        (prev ?? []).map((f) => (f.id === friendId ? { ...f, last_action } : f))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record hangout');
    }
  }, []);

  const deleteFriend = useCallback(async (friendId: string) => {
    try {
      await api.delete(`/friends/${friendId}`);
      setFriends((prev) => (prev ?? []).filter((f) => f.id !== friendId));
      // Also remove from any events locally
      setEvents((prev) =>
        (prev ?? []).map((e) => ({
          ...e,
          event_friends: e.event_friends.filter(
            (ef) => ef.friend_id !== friendId
          ),
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete friend');
    }
  }, []);

  // ── Group actions ──

  const addFriendToGroup = useCallback(
    async (friendId: string, groupName: string): Promise<string[] | null> => {
      try {
        const { groups } = await api.put<{ groups: string[] }>(
          `/friends/${friendId}/groups/${encodeURIComponent(groupName)}`
        );
        setFriends((prev) =>
          (prev ?? []).map((f) => (f.id === friendId ? { ...f, groups } : f))
        );
        return groups;
      } catch {
        return null;
      }
    },
    []
  );

  const removeFriendFromGroup = useCallback(
    async (friendId: string, groupName: string): Promise<string[] | null> => {
      try {
        const { groups } = await api.delete<{ groups: string[] }>(
          `/friends/${friendId}/groups/${encodeURIComponent(groupName)}`
        );
        setFriends((prev) =>
          (prev ?? []).map((f) => (f.id === friendId ? { ...f, groups } : f))
        );
        return groups;
      } catch {
        return null;
      }
    },
    []
  );

  const deleteGroup = useCallback(
    async (groupName: string): Promise<string | undefined> => {
      try {
        await api.delete(`/groups/${encodeURIComponent(groupName)}`);
        setFriends((prev) =>
          (prev ?? []).map((f) => ({
            ...f,
            groups: f.groups?.filter((g) => g !== groupName) ?? [],
          }))
        );
        return groupName;
      } catch {
        return undefined;
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const [friendsData, eventsData] = await Promise.all([
        api.get<Friend[]>('/friends'),
        api.get<AppEvent[]>('/events'),
      ]);
      if (!friendsData || !eventsData) return;

      const today = new Date().toISOString().split('T')[0];

      // For each friend, find the most recent past event they attended
      const latestEventDate: Record<string, string> = {};
      for (const event of eventsData) {
        if (event.date > today) continue;
        for (const { friend_id } of event.event_friends) {
          if (
            !latestEventDate[friend_id] ||
            event.date > latestEventDate[friend_id]
          ) {
            latestEventDate[friend_id] = event.date;
          }
        }
      }

      // Backfill last_action where the event date is more recent
      const updates = friendsData
        .filter((f) => {
          const eventDate = latestEventDate[f.id];
          if (!eventDate) return false;
          return !f.last_action || eventDate > f.last_action;
        })
        .map((f) =>
          api
            .post<{
              last_action: string;
            }>(`/friends/${f.id}/hangout`, { date: latestEventDate[f.id] })
            .then(({ last_action }) => ({ id: f.id, last_action }))
        );

      const updated = await Promise.all(updates);
      const updatedMap = Object.fromEntries(
        updated.map((u) => [u.id, u.last_action])
      );

      setFriends(
        friendsData.map((f) =>
          updatedMap[f.id] ? { ...f, last_action: updatedMap[f.id] } : f
        )
      );
      setEvents(eventsData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  const updateFriendGroupsLocally = useCallback(
    (friendId: string, groups: string[]) => {
      setFriends((prev) =>
        (prev ?? []).map((f) => (f.id === friendId ? { ...f, groups } : f))
      );
    },
    []
  );

  // ── Event actions ──

  const createEvent = useCallback(
    async (e: NewEvent): Promise<AppEvent | null> => {
      try {
        const data = await api.post<AppEvent>('/events', e);
        if (data) {
          setEvents((prev) => [...(prev ?? []), data]);
          scheduleEventReminder(data);
        }
        return data;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create event');
        return null;
      }
    },
    []
  );

  const updateEvent = useCallback(async (id: string, e: Partial<NewEvent>) => {
    try {
      const data = await api.put<AppEvent>(`/events/${id}`, e);
      if (data) {
        setEvents((prev) =>
          (prev ?? []).map((ev) => (ev.id === id ? data : ev))
        );
        scheduleEventReminder(data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update event');
    }
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    try {
      await api.delete(`/events/${id}`);
      setEvents((prev) => (prev ?? []).filter((e) => e.id !== id));
      cancelEventReminder(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  }, []);

  const addFriendsToEvent = useCallback(
    async (eventId: string, friendIds: string[]) => {
      try {
        const data = await api.post<AppEvent>(`/events/${eventId}/friends`, {
          friend_ids: friendIds,
        });
        if (data)
          setEvents((prev) =>
            (prev ?? []).map((e) => (e.id === eventId ? data : e))
          );
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Failed to add friends to event'
        );
      }
    },
    []
  );

  const removeFriendFromEvent = useCallback(
    async (eventId: string, friendId: string) => {
      try {
        await api.delete(`/events/${eventId}/friends/${friendId}`);
        setEvents((prev) =>
          (prev ?? []).map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  event_friends: e.event_friends.filter(
                    (ef) => ef.friend_id !== friendId
                  ),
                }
              : e
          )
        );
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to remove friend from event'
        );
      }
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        signIn,
        signUp,
        signOut,
        friends: friends ?? [],
        isLoadingFriends,
        addFriend,
        addFriends,
        recordHangout,
        deleteFriend,
        addFriendToGroup,
        removeFriendFromGroup,
        deleteGroup,
        updateFriendGroupsLocally,
        events: events ?? [],
        isLoadingEvents,
        createEvent,
        updateEvent,
        deleteEvent,
        addFriendsToEvent,
        removeFriendFromEvent,
        refresh,
        isRefreshing,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
