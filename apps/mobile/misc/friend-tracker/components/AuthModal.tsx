import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Modal } from '@402systems/lib-core-ui/native/components/Modal';
import { colors } from '../utils/colors';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}

type Mode = 'signin' | 'signup';

export function AuthModal({ visible, onClose, onSignIn, onSignUp }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setMode('signin');
    onClose();
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);

    const { error: authError } =
      mode === 'signin'
        ? await onSignIn(email.trim(), password)
        : await onSignUp(email.trim(), password);

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      handleClose();
    }
  };

  const isSignIn = mode === 'signin';
  const canSubmit = email.trim().length > 0 && password.trim().length > 0 && !loading;

  return (
    <Modal visible={visible} onClose={handleClose} title={isSignIn ? 'Sign in' : 'Create account'}>
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleTab, isSignIn && styles.toggleTabActive]}
          onPress={() => { setMode('signin'); setError(null); }}
        >
          <Text style={[styles.toggleText, isSignIn && styles.toggleTextActive]}>Sign in</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleTab, !isSignIn && styles.toggleTabActive]}
          onPress={() => { setMode('signup'); setError(null); }}
        >
          <Text style={[styles.toggleText, !isSignIn && styles.toggleTextActive]}>Sign up</Text>
        </Pressable>
      </View>

      <View style={styles.fields}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Pressable
        style={canSubmit ? styles.submitButton : [styles.submitButton, styles.disabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
      >
        {loading ? (
          <ActivityIndicator color={colors.bgCard} size="small" />
        ) : (
          <Text style={styles.submitText}>{isSignIn ? 'Sign in' : 'Create account'}</Text>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: colors.bgInput, borderRadius: 10, padding: 3 },
  toggleTab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  toggleTabActive: {
    backgroundColor: colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  toggleTextActive: { color: colors.primary },
  fields: { gap: 12 },
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
  errorBox: { backgroundColor: colors.errorBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { fontSize: 13, color: colors.error },
  submitButton: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  submitText: { color: colors.bgCard, fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.35 },
});
