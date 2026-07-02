import { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuotes } from '../hooks/useQuotes';
import { useMonitor } from '../hooks/useMonitor';
import { QuoteCard } from '../components/QuoteCard';
import { AddQuoteModal } from '../components/AddQuoteModal';
import { MonitorPanel } from '../components/MonitorPanel';
import { colors } from '../utils/colors';

export default function QuoteBreakScreen() {
  const { quotes, addQuote, deleteQuote } = useQuotes();
  const monitor = useMonitor();
  const { enabled: monitorEnabled, disable: disableMonitor } = monitor;
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (monitorEnabled && quotes.length === 0) {
      disableMonitor();
    }
  }, [monitorEnabled, quotes.length, disableMonitor]);

  const handleToggle = (next: boolean) => {
    if (next) {
      monitor.enable();
    } else {
      monitor.disable();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Quote Break</Text>
        <Text style={styles.subtitle}>
          A random quote of yours, once you&apos;ve been on your phone a while
        </Text>
      </View>

      <FlatList
        data={quotes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <MonitorPanel
            enabled={monitor.enabled}
            thresholdMinutes={monitor.thresholdMinutes}
            hasQuotes={quotes.length > 0}
            isSupported={monitor.isSupported}
            permissionDenied={monitor.permissionDenied}
            onToggle={handleToggle}
            onChangeThreshold={monitor.updateThreshold}
          />
        }
        renderItem={({ item }) => (
          <QuoteCard quote={item} onDelete={deleteQuote} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No quotes yet. Add one to get started.
            </Text>
          </View>
        }
      />

      <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color={colors.bgCard} />
      </Pressable>

      <AddQuoteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={addQuote}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgScreen },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: colors.textTertiary },
  listContent: { padding: 20, paddingTop: 12, gap: 12, flexGrow: 1 },
  separator: { height: 12 },
  empty: { paddingTop: 40, alignItems: 'center' },
  emptyText: { fontSize: 15, color: colors.textMuted },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
});
