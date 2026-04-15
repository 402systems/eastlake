import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Modal } from '@402systems/lib-core-ui/native/components/Modal';
import type { Friend } from '../context/AppContext';
import { colors } from '../utils/colors';

interface FriendPickerModalProps {
  visible: boolean;
  onClose: () => void;
  friends: Friend[];
  selectedIds: string[];
  onConfirm: (selectedIds: string[]) => void;
  title?: string;
}

export function FriendPickerModal({
  visible,
  onClose,
  friends,
  selectedIds,
  onConfirm,
  title = 'Add Friends',
}: FriendPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(selectedIds)
  );
  const [search, setSearch] = useState('');

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

  const handleConfirm = () => {
    onConfirm([...selected]);
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
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
      />
      <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
        <Text style={styles.confirmBtnText}>
          Add{' '}
          {selected.size > 0
            ? `${selected.size} friend${selected.size !== 1 ? 's' : ''}`
            : 'friends'}
        </Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.primary,
    marginBottom: 12,
  },
  list: { maxHeight: 240 },
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
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmBtnText: { color: colors.bgCard, fontSize: 16, fontWeight: '600' },
});
