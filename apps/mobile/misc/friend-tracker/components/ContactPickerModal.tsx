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
import { Modal } from '@402systems/lib-core-ui/components/Modal';
import type { NewFriend } from '../hooks/useFriends';

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
  // year may be 0 or undefined if not set
  const y = year && year > 0 ? String(year).padStart(4, '0') : null;
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return y ? `${y}-${m}-${d}` : `0000-${m}-${d}`;
}

function getPrimaryPhone(
  phones: Contacts.PhoneNumber[] | undefined
): string | null {
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
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Birthday,
      ],
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
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const selectedCount = contacts.filter((c) => c.selected).length;

  const handleImport = () => {
    const selected = contacts.filter((c) => c.selected);
    if (selected.length === 0) return;
    const friends: NewFriend[] = selected.map((c) => ({
      name: c.name,
      phone_number: c.phone,
      birthday: c.birthday,
    }));
    onImport(friends);
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
      {/* Search */}
      {!loading && !error && contacts.length > 0 && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search contacts..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      )}

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#94a3b8" />
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
                  style={({ pressed }) => [
                    styles.row,
                    alreadyAdded && styles.rowDisabled,
                    pressed && !alreadyAdded && { backgroundColor: '#f8fafc' },
                  ]}
                  disabled={alreadyAdded}
                >
                  <View
                    style={[
                      styles.checkbox,
                      item.selected && styles.checkboxSelected,
                    ]}
                  >
                    {item.selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <View style={styles.contactInfo}>
                    <Text
                      style={[
                        styles.contactName,
                        alreadyAdded && styles.contactNameDisabled,
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.phone && (
                      <Text style={styles.contactDetail} numberOfLines={1}>
                        {item.phone}
                      </Text>
                    )}
                  </View>
                  {alreadyAdded && (
                    <Text style={styles.alreadyLabel}>Added</Text>
                  )}
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.centered}>
                <Text style={styles.emptyText}>
                  {search ? 'No matches' : 'No contacts found'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.importButton,
          selectedCount === 0 && styles.disabled,
          pressed && selectedCount > 0 && { opacity: 0.8 },
        ]}
        onPress={handleImport}
        disabled={selectedCount === 0}
      >
        <Text style={styles.importButtonText}>
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
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  body: {
    maxHeight: 320,
  },
  centered: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 4,
    gap: 12,
    borderRadius: 8,
  },
  rowDisabled: {
    opacity: 0.4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
    gap: 2,
  },
  contactName: {
    fontSize: 15,
    color: '#0f172a',
  },
  contactNameDisabled: {
    color: '#94a3b8',
  },
  contactDetail: {
    fontSize: 12,
    color: '#94a3b8',
  },
  alreadyLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 38,
  },
  errorText: {
    fontSize: 14,
    color: '#b91c1c',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  importButton: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
});
