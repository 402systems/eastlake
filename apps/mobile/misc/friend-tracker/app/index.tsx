import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { AuthModal } from '../components/AuthModal';
import { colors } from '../utils/colors';

export default function WelcomeScreen() {
  const { user, authLoading, signIn, signUp } = useAppContext();
  const [authModalVisible, setAuthModalVisible] = useState(false);

  if (authLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/friends" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.icon}>👋</Text>
        <Text style={styles.title}>Friend Tracker</Text>
        <Text style={styles.subtitle}>
          See who you haven&apos;t hung out with lately.
        </Text>
        <Pressable onPress={() => setAuthModalVisible(true)} style={styles.button}>
          <Text style={styles.buttonText}>Get started</Text>
        </Pressable>
      </View>

      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSignIn={signIn}
        onSignUp={signUp}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgScreen },
  safe: { flex: 1, backgroundColor: colors.bgScreen },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '700', color: colors.primary, letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.textTertiary, textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  button: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 36, paddingVertical: 16 },
  buttonText: { fontSize: 16, fontWeight: '600', color: colors.bgCard },
});
