import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isMonitoring as nativeIsMonitoring,
  isScreenTimeSupported,
  requestNotificationPermission,
  startMonitoring as nativeStart,
  stopMonitoring as nativeStop,
  syncThresholdMinutes,
} from '../utils/screenTime';

const ENABLED_KEY = 'qb:monitorEnabled';
const THRESHOLD_KEY = 'qb:thresholdMinutes';
const DEFAULT_THRESHOLD_MINUTES = 15;

export function useMonitor() {
  const [enabled, setEnabled] = useState(false);
  const [thresholdMinutes, setThresholdMinutesState] = useState(
    DEFAULT_THRESHOLD_MINUTES
  );
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedEnabled, storedThreshold] = await Promise.all([
          AsyncStorage.getItem(ENABLED_KEY),
          AsyncStorage.getItem(THRESHOLD_KEY),
        ]);
        const threshold = storedThreshold
          ? parseInt(storedThreshold, 10)
          : DEFAULT_THRESHOLD_MINUTES;
        setThresholdMinutesState(threshold);
        await syncThresholdMinutes(threshold);

        // Reflect the service's real state in case Android killed it behind our back.
        const wasEnabled = storedEnabled === 'true';
        const runningNatively = wasEnabled && (await nativeIsMonitoring());
        setEnabled(runningNatively);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const enable = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      setPermissionDenied(true);
      return false;
    }
    setPermissionDenied(false);
    const started = await nativeStart();
    if (started) {
      setEnabled(true);
      await AsyncStorage.setItem(ENABLED_KEY, 'true');
    }
    return started;
  }, []);

  const disable = useCallback(async () => {
    await nativeStop();
    setEnabled(false);
    await AsyncStorage.setItem(ENABLED_KEY, 'false');
  }, []);

  const updateThreshold = useCallback(async (minutes: number) => {
    setThresholdMinutesState(minutes);
    await AsyncStorage.setItem(THRESHOLD_KEY, String(minutes));
    await syncThresholdMinutes(minutes);
  }, []);

  return {
    enabled,
    thresholdMinutes,
    isLoading,
    permissionDenied,
    isSupported: isScreenTimeSupported,
    enable,
    disable,
    updateThreshold,
  };
}
