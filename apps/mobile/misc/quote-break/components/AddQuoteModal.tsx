import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { Modal } from '@eastlake/lib-core-ui/native/components/Modal';
import { Input } from '@eastlake/lib-core-ui/native/components/Input';
import { Button } from '@eastlake/lib-core-ui/native/components/Button';

interface AddQuoteModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (text: string) => void;
}

export function AddQuoteModal({ visible, onClose, onAdd }: AddQuoteModalProps) {
  const [text, setText] = useState('');

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd(text);
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Add a Quote">
      <Input
        value={text}
        onChangeText={setText}
        placeholder="Be the change that you wish to see..."
        multiline
        numberOfLines={3}
        style={styles.input}
        autoFocus
      />
      <Button onPress={handleAdd} disabled={!text.trim()}>
        Add Quote
      </Button>
    </Modal>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
