import { Pressable, Text, View, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

interface OnOffToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export function OnOffToggle({ value, onChange, disabled }: OnOffToggleProps) {
  return (
    <View style={[styles.track, disabled && styles.trackDisabled]}>
      <Pressable
        onPress={() => !disabled && onChange(false)}
        disabled={disabled}
        style={[styles.option, !value && styles.optionActiveOff]}
      >
        <Text style={[styles.label, !value && styles.labelActive]}>Off</Text>
      </Pressable>
      <Pressable
        onPress={() => !disabled && onChange(true)}
        disabled={disabled}
        style={[styles.option, value && styles.optionActiveOn]}
      >
        <Text style={[styles.label, value && styles.labelActive]}>On</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bgInput,
    borderRadius: 20,
    padding: 3,
    width: 132,
  },
  trackDisabled: { opacity: 0.5 },
  option: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 17,
    alignItems: 'center',
  },
  optionActiveOff: { backgroundColor: colors.textMuted },
  optionActiveOn: { backgroundColor: colors.indigo },
  label: { fontSize: 13, fontWeight: '600', color: colors.textTertiary },
  labelActive: { color: colors.bgCard },
});
