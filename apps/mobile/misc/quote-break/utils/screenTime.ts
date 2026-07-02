import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

/** The screen-time service is native-only: it needs a custom dev build, not Expo Go. */
export const isScreenTimeSupported = !isExpoGo;

async function getNativeModule() {
  if (isExpoGo) return null;
  try {
    const mod = await import('../modules/quote-break');
    return mod.default;
  } catch {
    return null;
  }
}

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

export async function syncQuotes(quotes: string[]): Promise<void> {
  const native = await getNativeModule();
  native?.setQuotes(quotes);
}

export async function syncThresholdMinutes(minutes: number): Promise<void> {
  const native = await getNativeModule();
  native?.setThresholdMinutes(minutes);
}

export async function startMonitoring(): Promise<boolean> {
  const native = await getNativeModule();
  if (!native) return false;
  native.startMonitoring();
  return true;
}

export async function stopMonitoring(): Promise<void> {
  const native = await getNativeModule();
  native?.stopMonitoring();
}

export async function isMonitoring(): Promise<boolean> {
  const native = await getNativeModule();
  return native ? native.isMonitoring() : false;
}
