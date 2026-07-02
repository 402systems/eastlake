import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import { Card } from '@eastlake/lib-core-ui/native/components/Card';
import { colors } from '../utils/colors';

interface MonitorPanelProps {
  enabled: boolean;
  thresholdMinutes: number;
  hasQuotes: boolean;
  isSupported: boolean;
  permissionDenied: boolean;
  onToggle: (next: boolean) => void;
  onChangeThreshold: (minutes: number) => void;
}

const MIN_THRESHOLD = 5;
const MAX_THRESHOLD = 120;
const STEP = 5;

export function MonitorPanel({
  enabled,
  thresholdMinutes,
  hasQuotes,
  isSupported,
  permissionDenied,
  onToggle,
  onChangeThreshold,
}: MonitorPanelProps) {
  const disabled = !isSupported || !hasQuotes;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Screen Time Reminders</Text>
          <Text style={styles.subtitle}>
            Get a quote after {thresholdMinutes} min of screen-on time
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ true: colors.indigo }}
        />
      </View>

      <View style={styles.thresholdRow}>
        <Text style={styles.thresholdLabel}>Remind me every</Text>
        <View style={styles.stepper}>
          <Pressable
            onPress={() =>
              onChangeThreshold(
                Math.max(MIN_THRESHOLD, thresholdMinutes - STEP)
              )
            }
            hitSlop={8}
            style={styles.stepperButton}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </Pressable>
          <Text style={styles.stepperValue}>{thresholdMinutes} min</Text>
          <Pressable
            onPress={() =>
              onChangeThreshold(
                Math.min(MAX_THRESHOLD, thresholdMinutes + STEP)
              )
            }
            hitSlop={8}
            style={styles.stepperButton}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {!isSupported && (
        <Text style={styles.warning}>
          Screen-time tracking needs a custom Android build — it isn&apos;t
          available in Expo Go.
        </Text>
      )}
      {isSupported && !hasQuotes && (
        <Text style={styles.warning}>
          Add a quote below to enable reminders.
        </Text>
      )}
      {permissionDenied && (
        <Text style={styles.warning}>
          Notification permission was denied. Enable it in system settings to
          get reminders.
        </Text>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.primary },
  subtitle: { fontSize: 13, color: colors.textTertiary },
  thresholdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  thresholdLabel: { fontSize: 14, color: colors.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgInput,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 18, fontWeight: '600', color: colors.primary },
  stepperValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    minWidth: 56,
    textAlign: 'center',
  },
  warning: {
    fontSize: 13,
    color: colors.warningText,
    backgroundColor: colors.warningBg,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
