import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Modal } from '@402systems/lib-core-ui';
import type { Friend } from '../hooks/useFriends';

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
          placeholderTextColor="#94a3b8"
          value={newGroupName}
          onChangeText={setNewGroupName}
          onSubmitEditing={handleAddNew}
          returnKeyType="done"
        />
        <Pressable
          onPress={handleAddNew}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.addBtnText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(name) => name}
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
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  addBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    maxHeight: 350,
  },
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
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0f172a',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
