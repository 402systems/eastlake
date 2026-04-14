import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { Modal } from '@402systems/lib-core-ui/native/components/Modal';
import type { NewFriend } from '../hooks/useFriends';
import { colors } from '../utils/colors';

interface ContactPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImport: (friends: NewFriend[]) => void;
  existingNames: string[];
}

interface ContactItem {
  id: string;
  name: string;
  phone: string | null;
  birthday: string | null;
  selected: boolean;
}

function formatBirthday(bday: Contacts.Date | undefined): string | null {
  if (!bday) return null;
  const { year, month, day } = bday;
  if (!month || !day) return null;
  const y = year && year > 0 ? String(year).padStart(4, '0') : null;
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return y ? `${y}-${m}-${d}` : `0000-${m}-${d}`;
}

function getPrimaryPhone(phones: Contacts.PhoneNumber[] | undefined): string | null {
  if (!phones || phones.length === 0) return null;
  return phones[0].number ?? null;
}

export function ContactPickerModal({
  visible,
  onClose,
  onImport,
  existingNames,
}: ContactPickerModalProps) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingSet = new Set(existingNames.map((n) => n.toLowerCase()));

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    setSearch('');

    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      setError('Contacts permission denied.');
      setLoading(false);
      return;
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers, Contacts.Fields.Birthday],
      sort: Contacts.SortTypes.FirstName,
    });

    const items: ContactItem[] = data
      .filter((c) => c.name && c.name.trim().length > 0)
      .map((c) => ({
        id: c.id!,
        name: c.name!,
        phone: getPrimaryPhone(c.phoneNumbers),
        birthday: formatBirthday(c.birthday),
        selected: false,
      }));

    setContacts(items);
    setLoading(false);
  };

  useEffect(() => {
    if (!visible) return;
    loadContacts(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter((c) => c.name.toLowerCase().includes(q));
  }, [contacts, search]);

  const toggleContact = (id: string) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const selectedCount = contacts.filter((c) => c.selected).length;

  const handleImport = () => {
    const selected = contacts.filter((c) => c.selected);
    if (selected.length === 0) return;
    onImport(selected.map((c) => ({ name: c.name, phone_number: c.phone, birthday: c.birthday })));
    onClose();
    setContacts([]);
  };

  const handleClose = () => {
    onClose();
    setContacts([]);
    setSearch('');
  };

  return (
    <Modal visible={visible} onClose={handleClose} title="Import from contacts">
      {!loading && !error && contacts.length > 0 && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      )}

      <View style={{ maxHeight: 240 }}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.textMuted} />
            <Text style={styles.loadingText}>Loading contacts...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const alreadyAdded = existingSet.has(item.name.toLowerCase());
              return (
                <Pressable
                  onPress={() => !alreadyAdded && toggleContact(item.id)}
                  style={alreadyAdded ? [styles.row, styles.rowDisabled] : styles.row}
                  disabled={alreadyAdded}
                >
                  <View style={[styles.checkbox, item.selected && styles.checkboxSelected]}>
                    {item.selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.contactInfo}>
                    <Text
                      style={[styles.contactName, alreadyAdded && styles.contactNameDisabled]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.phone && (
                      <Text style={styles.contactDetail} numberOfLines={1}>{item.phone}</Text>
                    )}
                  </View>
                  {alreadyAdded && <Text style={styles.alreadyLabel}>Added</Text>}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>{search ? 'No matches' : 'No contacts found'}</Text>
              </View>
            }
          />
        )}
      </View>

      <Pressable
        onPress={handleImport}
        disabled={selectedCount === 0}
        style={[styles.importBtn, selectedCount === 0 && styles.importBtnDisabled]}
      >
        <Text style={styles.importBtnText}>
          {selectedCount === 0
            ? 'Select contacts'
            : `Import ${selectedCount} friend${selectedCount !== 1 ? 's' : ''}`}
        </Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.primary,
    backgroundColor: colors.bgCard,
  },
  centered: { height: 150, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingText: { fontSize: 13, color: colors.textMuted },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: 8,
  },
  rowDisabled: { opacity: 0.4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.bgCard, fontSize: 13, fontWeight: '700' },
  contactInfo: { flex: 1, gap: 2 },
  contactName: { fontSize: 15, color: colors.primary },
  contactNameDisabled: { color: colors.textMuted },
  contactDetail: { fontSize: 12, color: colors.textMuted },
  alreadyLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
  separator: { height: 1, backgroundColor: colors.bgInput, marginLeft: 38 },
  errorText: { fontSize: 14, color: colors.error, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted },
  importBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  importBtnDisabled: { opacity: 0.35 },
  importBtnText: { color: colors.bgCard, fontSize: 16, fontWeight: '600' },
});
