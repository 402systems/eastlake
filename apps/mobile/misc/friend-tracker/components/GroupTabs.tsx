import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
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
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.chip, activeGroup === null && styles.chipActive]}
      >
        <Text
          style={[
            styles.chipText,
            activeGroup === null && styles.chipTextActive,
          ]}
        >
          All
        </Text>
      </Pressable>

      {groups.map((name) => (
        <Pressable
          key={name}
          onPress={() => onSelect(name)}
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
        </Pressable>
      ))}

      <Pressable onPress={onManage} style={styles.chip}>
        <Text style={styles.chipText}>+</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginBottom: 6 },
  container: { paddingHorizontal: 20, gap: 8 },
  chip: {
    backgroundColor: colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.bgCard },
});
