import { Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@eastlake/lib-core-ui/native/components/Card';
import { colors } from '../utils/colors';
import type { Quote } from '../hooks/useQuotes';

interface QuoteCardProps {
  quote: Quote;
  onDelete: (id: string) => void;
}

export function QuoteCard({ quote, onDelete }: QuoteCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.text}>&ldquo;{quote.text}&rdquo;</Text>
      <Pressable
        onPress={() => onDelete(quote.id)}
        hitSlop={8}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: colors.primary,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 2,
  },
});
