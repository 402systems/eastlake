import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Friend, AppEvent } from '../context/AppContext';

const FRIENDS_KEY = 'ft:friends';
const EVENTS_KEY = 'ft:events';

export async function getCachedFriends(
  userId: string
): Promise<Friend[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${FRIENDS_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as Friend[]) : null;
  } catch {
    return null;
  }
}

export async function cacheFriends(
  userId: string,
  friends: Friend[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${FRIENDS_KEY}:${userId}`,
      JSON.stringify(friends)
    );
  } catch {
    // ignore storage errors
  }
}

export async function getCachedEvents(
  userId: string
): Promise<AppEvent[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${EVENTS_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as AppEvent[]) : null;
  } catch {
    return null;
  }
}

export async function cacheEvents(
  userId: string,
  events: AppEvent[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${EVENTS_KEY}:${userId}`,
      JSON.stringify(events)
    );
  } catch {
    // ignore storage errors
  }
}
