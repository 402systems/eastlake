import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Modal } from '@eastlake/lib-core-ui/native/components/Modal';
import type { Friend } from '../context/AppContext';
import { colors } from '../utils/colors';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  friends: Friend[];
  onCreate: (groupName: string, friendIds: string[]) => Promise<void>;
}

export function CreateGroupModal({
  visible,
  onClose,
  friends,
  onCreate,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(
    () =>
      friends.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase())
      ),
    [friends, search]
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    const trimmed = groupName.trim();
    if (!trimmed) return;
    setLoading(true);
    await onCreate(trimmed, [...selected]);
    setLoading(false);
    setGroupName('');
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  const canCreate = groupName.trim().length > 0;

  return (
    <Modal visible={visible} onClose={handleClose} title="New Group">
      <TextInput
        style={styles.nameInput}
        placeholder="Group name"
        placeholderTextColor={colors.textMuted}
        value={groupName}
        onChangeText={setGroupName}
        autoFocus
        returnKeyType="next"
      />

      <Text style={styles.sectionLabel}>Add friends</Text>

      <TextInput
        style={styles.search}
        placeholder="Search..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />

      <FlatList
        data={filtered}
        keyExtractor={(f) => f.id}
        style={styles.list}
        renderItem={({ item }) => {
          const checked = selected.has(item.id);
          return (
            <Pressable onPress={() => toggle(item.id)} style={styles.row}>
              <Text style={styles.rowName}>{item.name}</Text>
              <View
                style={[styles.checkbox, checked && styles.checkboxChecked]}
              >
                {checked && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No friends found</Text>
        }
      />

      <Pressable
        onPress={handleCreate}
        style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
        disabled={!canCreate || loading}
      >
        <Text style={styles.createBtnText}>
          {loading
            ? 'Creating…'
            : selected.size > 0
              ? `Create group with ${selected.size} friend${selected.size !== 1 ? 's' : ''}`
              : 'Create group'}
        </Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  nameInput: {
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  search: {
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.primary,
    marginBottom: 12,
  },
  list: { maxHeight: 220 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowName: { fontSize: 16, color: colors.primary, flex: 1 },
  checkbox: {
    width: 22,
    height: 22,
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
  checkmark: { color: colors.bgCard, fontSize: 13, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.bgInput },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: colors.bgCard, fontSize: 16, fontWeight: '600' },
});
