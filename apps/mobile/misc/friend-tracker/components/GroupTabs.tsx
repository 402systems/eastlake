import { ScrollView, View, Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

interface GroupTabsProps {
  groups: string[];
  activeGroup: string | null;
  onSelect: (groupName: string | null) => void;
  onManage: () => void;
}

export function GroupTabs({
  groups,
  activeGroup,
  onSelect,
  onManage,
}: GroupTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      <Pressable onPress={() => onSelect(null)}>
        <View style={[styles.chip, activeGroup === null && styles.chipActive]}>
          <Text
            style={[
              styles.chipText,
              activeGroup === null && styles.chipTextActive,
            ]}
          >
            All
          </Text>
        </View>
      </Pressable>

      {groups.map((name) => (
        <Pressable key={name} onPress={() => onSelect(name)}>
          <View
            style={[styles.chip, activeGroup === name && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                activeGroup === name && styles.chipTextActive,
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>
        </Pressable>
      ))}

      <Pressable onPress={onManage}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>+</Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0, marginBottom: 6 },
  container: { paddingHorizontal: 20, paddingVertical: 4, gap: 8 },
  chip: {
    backgroundColor: colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexShrink: 0,
    maxWidth: 160,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.bgCard },
});
