import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';
import { Modal } from '@eastlake/lib-core-ui/native/components/Modal';
import { colors } from '../utils/colors';

interface ManageGroupsModalProps {
  visible: boolean;
  onClose: () => void;
  groups: string[];
  onDelete: (name: string) => Promise<string | undefined>;
}

export function ManageGroupsModal({
  visible,
  onClose,
  groups,
  onDelete,
}: ManageGroupsModalProps) {
  return (
    <Modal visible={visible} onClose={onClose} title="Manage Groups">
      <FlatList
        data={groups}
        keyExtractor={(name) => name}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.groupName} numberOfLines={1}>
              {item}
            </Text>
            <Pressable
              onPress={() => onDelete(item)}
              style={styles.deleteBtn}
              hitSlop={8}
            >
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No groups yet. Assign a group to a friend using the 🏷 button.
          </Text>
        }
        style={styles.list}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 300 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.primary,
    flex: 1,
    marginRight: 12,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.errorBg,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: colors.danger },
  separator: { height: 1, backgroundColor: colors.bgInput },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
