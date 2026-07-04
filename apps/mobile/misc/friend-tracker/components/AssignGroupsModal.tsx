import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Modal } from '@eastlake/lib-core-ui/native/components/Modal';
import type { Friend } from '../hooks/useFriends';
import { colors } from '../utils/colors';

interface AssignGroupsModalProps {
  visible: boolean;
  onClose: () => void;
  friend: Friend | null;
  groups: string[];
  onToggle: (friendId: string, groupName: string, isMember: boolean) => void;
}

export function AssignGroupsModal({
  visible,
  onClose,
  friend,
  groups,
  onToggle,
}: AssignGroupsModalProps) {
  const [newGroupName, setNewGroupName] = useState('');

  if (!friend) return null;

  const friendGroups = friend.groups ?? [];

  const handleAddNew = () => {
    const trimmed = newGroupName.trim();
    if (!trimmed || !friend) return;
    onToggle(friend.id, trimmed, false);
    setNewGroupName('');
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Groups for ${friend.name}`}
    >
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="New group name"
          placeholderTextColor={colors.textMuted}
          value={newGroupName}
          onChangeText={setNewGroupName}
          onSubmitEditing={handleAddNew}
          returnKeyType="done"
        />
        <Pressable onPress={handleAddNew} style={styles.addBtn}>
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(name) => name}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const isMember = friendGroups.includes(item);
          return (
            <Pressable
              onPress={() => onToggle(friend.id, item, isMember)}
              style={styles.row}
            >
              <View
                style={[styles.checkbox, isMember && styles.checkboxChecked]}
              >
                {isMember && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.groupName}>{item}</Text>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No groups yet. Type a name above to create one.
          </Text>
        }
        style={styles.list}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: colors.bgScreen,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.primary,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: { color: colors.bgCard, fontSize: 14, fontWeight: '600' },
  list: { maxHeight: 350 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: { color: colors.bgCard, fontSize: 14, fontWeight: '700' },
  groupName: { fontSize: 16, fontWeight: '500', color: colors.primary },
  separator: { height: 1, backgroundColor: colors.bgInput },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
