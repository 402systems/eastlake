import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Modal } from '@402systems/lib-core-ui/native/components/Modal';
import { config } from '../tracker.config';
import { colors } from '../utils/colors';

interface AddFriendModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (friend: {
    name: string;
    phone_number?: string;
    birthday?: string;
  }) => void;
}

export function AddFriendModal({
  visible,
  onClose,
  onAdd,
}: AddFriendModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');

  const handleClose = () => {
    setName('');
    setPhone('');
    setBirthday('');
    onClose();
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({
      name: trimmed,
      phone_number: phone.trim() || undefined,
      birthday: birthday.trim() || undefined,
    });
    setName('');
    setPhone('');
    setBirthday('');
    onClose();
  };

  const canSubmit = name.trim().length > 0;

  return (
    <Modal visible={visible} onClose={handleClose} title={config.addModalTitle}>
      <TextInput
        style={styles.input}
        placeholder={config.addInputPlaceholder}
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone number (optional)"
        placeholderTextColor={colors.textMuted}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Birthday YYYY-MM-DD (optional)"
        placeholderTextColor={colors.textMuted}
        value={birthday}
        onChangeText={setBirthday}
        returnKeyType="done"
        onSubmitEditing={handleAdd}
      />
      <View style={styles.buttons}>
        <Pressable style={styles.cancelButton} onPress={handleClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={
            canSubmit
              ? styles.submitButton
              : [styles.submitButton, styles.disabled]
          }
          onPress={handleAdd}
          disabled={!canSubmit}
        >
          <Text style={styles.submitText}>Add {config.itemNoun.singular}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.primary,
    backgroundColor: colors.bgCard,
  },
  buttons: { flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { fontSize: 15, color: colors.bgCard, fontWeight: '600' },
  disabled: { opacity: 0.35 },
});
