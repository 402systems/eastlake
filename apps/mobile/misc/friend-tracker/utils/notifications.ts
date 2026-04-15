import Constants from 'expo-constants';
import type { AppEvent } from '../context/AppContext';

const isExpoGo = Constants.appOwnership === 'expo';

export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const Notifications = await import('expo-notifications');
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleEventReminder(event: AppEvent): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    const [year, month, day] = event.date.split('-').map(Number);
    const triggerDate = new Date(year, month - 1, day - 1, 9, 0, 0);
    if (triggerDate <= new Date()) return;
    await cancelEventReminder(event.id);
    await Notifications.scheduleNotificationAsync({
      identifier: `event-${event.id}`,
      content: {
        title: 'Tomorrow: ' + event.name,
        body: "Don't forget your event tomorrow!",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch {
    // no-op
  }
}

export async function cancelEventReminder(eventId: string): Promise<void> {
  if (isExpoGo) return;
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.cancelScheduledNotificationAsync(`event-${eventId}`);
  } catch {
    // no-op
  }
}
