import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'ft:sync_queue';

export type QueuedOp =
  | { type: 'recordHangout'; friendId: string; date: string }
  | { type: 'deleteFriend'; friendId: string }
  | { type: 'addFriendToGroup'; friendId: string; groupName: string }
  | { type: 'removeFriendFromGroup'; friendId: string; groupName: string }
  | { type: 'deleteGroup'; groupName: string }
  | {
      type: 'updateEvent';
      eventId: string;
      data: { name?: string; date?: string };
    }
  | { type: 'deleteEvent'; eventId: string }
  | { type: 'addFriendsToEvent'; eventId: string; friendIds: string[] }
  | { type: 'removeFriendFromEvent'; eventId: string; friendId: string };

export async function getQueue(userId: string): Promise<QueuedOp[]> {
  try {
    const raw = await AsyncStorage.getItem(`${QUEUE_KEY}:${userId}`);
    return raw ? (JSON.parse(raw) as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

export async function enqueue(userId: string, op: QueuedOp): Promise<void> {
  try {
    const queue = await getQueue(userId);
    queue.push(op);
    await AsyncStorage.setItem(`${QUEUE_KEY}:${userId}`, JSON.stringify(queue));
  } catch {
    // ignore storage errors
  }
}

export async function setQueue(userId: string, ops: QueuedOp[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${QUEUE_KEY}:${userId}`, JSON.stringify(ops));
  } catch {
    // ignore storage errors
  }
}
