import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Modal } from '@402systems/lib-core-ui/components/Modal';
import { config } from '../tracker.config';

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
        placeholderTextColor="#94a3b8"
        value={name}
        onChangeText={setName}
        autoFocus
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Phone number (optional)"
        placeholderTextColor="#94a3b8"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        returnKeyType="next"
      />
      <TextInput
        style={styles.input}
        placeholder="Birthday YYYY-MM-DD (optional)"
        placeholderTextColor="#94a3b8"
        value={birthday}
        onChangeText={setBirthday}
        returnKeyType="done"
        onSubmitEditing={handleAdd}
      />
      <View style={styles.buttons}>
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.pressed,
          ]}
          onPress={handleClose}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            !canSubmit && styles.disabled,
            pressed && canSubmit && styles.pressed,
          ]}
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
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.8,
  },
});
