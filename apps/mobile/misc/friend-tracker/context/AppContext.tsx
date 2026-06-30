import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import type { User } from '@supabase/supabase-js';
import { useAuth } from '@eastlake/lib-core-supabase-auth/native/hooks/useAuth';
import { api } from '../api/client';
import {
  requestNotificationPermission,
  scheduleEventReminder,
  cancelEventReminder,
} from '../utils/notifications';
import {
  getCachedFriends,
  cacheFriends,
  getCachedEvents,
  cacheEvents,
} from '../storage/offlineStorage';
import {
  getQueue,
  enqueue,
  setQueue,
  type QueuedOp,
} from '../storage/syncQueue';

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
  // Number of writes made offline waiting to sync
  pendingSyncCount: number;
  error: string | null;
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    (err.message === 'Network request failed' ||
      err.message === 'Failed to fetch')
  );
}

async function replayOp(op: QueuedOp): Promise<void> {
  switch (op.type) {
    case 'recordHangout':
      await api.post(`/friends/${op.friendId}/hangout`, { date: op.date });
      break;
    case 'deleteFriend':
      await api.delete(`/friends/${op.friendId}`);
      break;
    case 'addFriendToGroup':
      await api.put(
        `/friends/${op.friendId}/groups/${encodeURIComponent(op.groupName)}`
      );
      break;
    case 'removeFriendFromGroup':
      await api.delete(
        `/friends/${op.friendId}/groups/${encodeURIComponent(op.groupName)}`
      );
      break;
    case 'deleteGroup':
      await api.delete(`/groups/${encodeURIComponent(op.groupName)}`);
      break;
    case 'updateEvent':
      await api.put(`/events/${op.eventId}`, op.data);
      break;
    case 'deleteEvent':
      await api.delete(`/events/${op.eventId}`);
      break;
    case 'addFriendsToEvent':
      await api.post(`/events/${op.eventId}/friends`, {
        friend_ids: op.friendIds,
      });
      break;
    case 'removeFriendFromEvent':
      await api.delete(`/events/${op.eventId}/friends/${op.friendId}`);
      break;
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();

  // null = not yet fetched; [] = fetched but empty; Friend[] = loaded
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [events, setEvents] = useState<AppEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Refs so callbacks can read current state without being recreated
  const friendsRef = useRef(friends);
  const eventsRef = useRef(events);
  useEffect(() => {
    friendsRef.current = friends;
  }, [friends]);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Track previous user ID to reset data when the user changes.
  // setState-during-render is the React-recommended pattern for derived state
  // resets: React re-renders immediately with the new state, no effect needed.
  const [prevUserId, setPrevUserId] = useState(user?.id);
  if (prevUserId !== user?.id) {
    setPrevUserId(user?.id);
    setFriends(null);
    setEvents(null);
    setPendingSyncCount(0);
  }

  const isLoadingFriends = !!user && !authLoading && friends === null;
  const isLoadingEvents = !!user && !authLoading && events === null;

  // Request notification permission once on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Auto-persist to cache whenever state changes
  useEffect(() => {
    if (user && friends !== null) cacheFriends(user.id, friends);
  }, [user, friends]);

  useEffect(() => {
    if (user && events !== null) cacheEvents(user.id, events);
  }, [user, events]);

  // Load friends: serve cache immediately, then refresh from API in background
  useEffect(() => {
    if (!user || authLoading) return;
    let cancelled = false;

    getCachedFriends(user.id).then((cached) => {
      if (cached && !cancelled) setFriends(cached);
    });

    api
      .get<Friend[]>('/friends')
      .then((data) => {
        if (!cancelled && data) setFriends(data);
      })
      .catch((err) => {
        if (!cancelled && !isNetworkError(err)) {
          setError(
            err instanceof Error ? err.message : 'Failed to load friends'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Load events: serve cache immediately, then refresh from API in background
  useEffect(() => {
    if (!user || authLoading) return;
    let cancelled = false;

    getCachedEvents(user.id).then((cached) => {
      if (cached && !cancelled) setEvents(cached);
    });

    api
      .get<AppEvent[]>('/events')
      .then((data) => {
        if (!cancelled && data) setEvents(data);
      })
      .catch((err) => {
        if (!cancelled && !isNetworkError(err)) {
          setError(
            err instanceof Error ? err.message : 'Failed to load events'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  // Load pending sync count from queue on user change
  useEffect(() => {
    if (!user) return;
    getQueue(user.id).then((q) => setPendingSyncCount(q.length));
  }, [user]);

  // ── Friend actions ──

  const addFriend = useCallback(async (f: NewFriend) => {
    try {
      const data = await api.post<Friend>('/friends', f);
      if (data) setFriends((prev) => [...(prev ?? []), data]);
    } catch (err: unknown) {
      if (isNetworkError(err)) {
        setError("You're offline. Connect to the internet to add new friends.");
      } else {
        setError(err instanceof Error ? err.message : 'Failed to add friend');
      }
    }
  }, []);

  const addFriends = useCallback(async (fs: NewFriend[]) => {
    const failed: string[] = [];
    let networkBlocked = false;
    for (const f of fs) {
      try {
        const data = await api.post<Friend>('/friends', f);
        if (data) setFriends((prev) => [...(prev ?? []), data]);
      } catch (err) {
        if (isNetworkError(err)) {
          networkBlocked = true;
          break;
        }
        failed.push(f.name);
      }
    }
    if (networkBlocked) {
      setError("You're offline. Connect to the internet to import friends.");
    } else if (failed.length > 0) {
      setError(`Failed to import: ${failed.join(', ')}`);
    }
  }, []);

  const recordHangout = useCallback(
    async (friendId: string) => {
      try {
        const { last_action } = await api.post<{ last_action: string }>(
          `/friends/${friendId}/hangout`
        );
        setFriends((prev) =>
          (prev ?? []).map((f) =>
            f.id === friendId ? { ...f, last_action } : f
          )
        );
      } catch (err: unknown) {
        if (isNetworkError(err) && user) {
          const today = new Date().toISOString().split('T')[0];
          setFriends((prev) =>
            (prev ?? []).map((f) =>
              f.id === friendId ? { ...f, last_action: today } : f
            )
          );
          await enqueue(user.id, {
            type: 'recordHangout',
            friendId,
            date: today,
          });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to record hangout'
          );
        }
      }
    },
    [user]
  );

  const deleteFriend = useCallback(
    async (friendId: string) => {
      // Optimistic remove
      setFriends((prev) => (prev ?? []).filter((f) => f.id !== friendId));
      setEvents((prev) =>
        (prev ?? []).map((e) => ({
          ...e,
          event_friends: e.event_friends.filter(
            (ef) => ef.friend_id !== friendId
          ),
        }))
      );

      try {
        await api.delete(`/friends/${friendId}`);
      } catch (err: unknown) {
        if (isNetworkError(err) && user) {
          await enqueue(user.id, { type: 'deleteFriend', friendId });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to delete friend'
          );
        }
      }
    },
    [user]
  );

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
      } catch (err) {
        if (isNetworkError(err) && user) {
          const current = friendsRef.current?.find((f) => f.id === friendId);
          const newGroups = [
            ...new Set([...(current?.groups ?? []), groupName]),
          ];
          setFriends((prev) =>
            (prev ?? []).map((f) =>
              f.id === friendId ? { ...f, groups: newGroups } : f
            )
          );
          await enqueue(user.id, {
            type: 'addFriendToGroup',
            friendId,
            groupName,
          });
          setPendingSyncCount((c) => c + 1);
          return newGroups;
        }
        return null;
      }
    },
    [user]
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
      } catch (err) {
        if (isNetworkError(err) && user) {
          const current = friendsRef.current?.find((f) => f.id === friendId);
          const newGroups = (current?.groups ?? []).filter(
            (g) => g !== groupName
          );
          setFriends((prev) =>
            (prev ?? []).map((f) =>
              f.id === friendId ? { ...f, groups: newGroups } : f
            )
          );
          await enqueue(user.id, {
            type: 'removeFriendFromGroup',
            friendId,
            groupName,
          });
          setPendingSyncCount((c) => c + 1);
          return newGroups;
        }
        return null;
      }
    },
    [user]
  );

  const deleteGroup = useCallback(
    async (groupName: string): Promise<string | undefined> => {
      // Optimistic remove
      setFriends((prev) =>
        (prev ?? []).map((f) => ({
          ...f,
          groups: f.groups?.filter((g) => g !== groupName) ?? [],
        }))
      );

      try {
        await api.delete(`/groups/${encodeURIComponent(groupName)}`);
        return groupName;
      } catch (err) {
        if (isNetworkError(err) && user) {
          await enqueue(user.id, { type: 'deleteGroup', groupName });
          setPendingSyncCount((c) => c + 1);
          return groupName;
        }
        return undefined;
      }
    },
    [user]
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
      if (!isNetworkError(err)) {
        setError(err instanceof Error ? err.message : 'Failed to refresh');
      }
      // Offline: silently keep cached data
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  // Flush queued offline ops to API, then refresh
  const flushQueue = useCallback(async () => {
    if (!user) return;
    const queue = await getQueue(user.id);
    if (queue.length === 0) return;

    let processedCount = 0;
    for (const op of queue) {
      try {
        await replayOp(op);
        processedCount++;
      } catch (err) {
        if (isNetworkError(err)) break; // Still offline, stop
        processedCount++; // Skip non-network errors (e.g. 404 — already gone)
      }
    }

    const remaining = queue.slice(processedCount);
    await setQueue(user.id, remaining);
    setPendingSyncCount(remaining.length);

    if (processedCount > 0) await refresh();
  }, [user, refresh]);

  // Trigger queue flush whenever app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') flushQueue();
    });
    return () => sub.remove();
  }, [flushQueue]);

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
        if (isNetworkError(err)) {
          setError("You're offline. Connect to the internet to create events.");
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to create event'
          );
        }
        return null;
      }
    },
    []
  );

  const updateEvent = useCallback(
    async (id: string, e: Partial<NewEvent>) => {
      // Optimistic update
      setEvents((prev) =>
        (prev ?? []).map((ev) => (ev.id === id ? { ...ev, ...e } : ev))
      );

      try {
        const data = await api.put<AppEvent>(`/events/${id}`, e);
        if (data) {
          setEvents((prev) =>
            (prev ?? []).map((ev) => (ev.id === id ? data : ev))
          );
          scheduleEventReminder(data);
        }
      } catch (err: unknown) {
        if (isNetworkError(err) && user) {
          await enqueue(user.id, { type: 'updateEvent', eventId: id, data: e });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to update event'
          );
        }
      }
    },
    [user]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      // Optimistic remove
      setEvents((prev) => (prev ?? []).filter((e) => e.id !== id));
      cancelEventReminder(id);

      try {
        await api.delete(`/events/${id}`);
      } catch (err: unknown) {
        if (isNetworkError(err) && user) {
          await enqueue(user.id, { type: 'deleteEvent', eventId: id });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error ? err.message : 'Failed to delete event'
          );
        }
      }
    },
    [user]
  );

  const addFriendsToEvent = useCallback(
    async (eventId: string, friendIds: string[]) => {
      // Optimistic update
      setEvents((prev) =>
        (prev ?? []).map((e) =>
          e.id === eventId
            ? {
                ...e,
                event_friends: [
                  ...e.event_friends,
                  ...friendIds
                    .filter(
                      (id) => !e.event_friends.some((ef) => ef.friend_id === id)
                    )
                    .map((id) => ({ friend_id: id })),
                ],
              }
            : e
        )
      );

      try {
        const data = await api.post<AppEvent>(`/events/${eventId}/friends`, {
          friend_ids: friendIds,
        });
        if (data)
          setEvents((prev) =>
            (prev ?? []).map((e) => (e.id === eventId ? data : e))
          );
      } catch (err: unknown) {
        if (isNetworkError(err) && user) {
          await enqueue(user.id, {
            type: 'addFriendsToEvent',
            eventId,
            friendIds,
          });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to add friends to event'
          );
        }
      }
    },
    [user]
  );

  const removeFriendFromEvent = useCallback(
    async (eventId: string, friendId: string) => {
      // Optimistic remove
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

      try {
        await api.delete(`/events/${eventId}/friends/${friendId}`);
      } catch (err: unknown) {
        if (isNetworkError(err) && user) {
          await enqueue(user.id, {
            type: 'removeFriendFromEvent',
            eventId,
            friendId,
          });
          setPendingSyncCount((c) => c + 1);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to remove friend from event'
          );
        }
      }
    },
    [user]
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
        pendingSyncCount,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
