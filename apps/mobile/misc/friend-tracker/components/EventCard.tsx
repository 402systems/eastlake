import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { AppEvent, Friend } from '../context/AppContext';
import { formatDate, isPast } from '../utils/date';
import { colors } from '../utils/colors';

interface EventCardProps {
  event: AppEvent;
  friends: Friend[];
  onPress: () => void;
  onDelete: () => void;
}

export function EventCard({ event, friends, onPress, onDelete }: EventCardProps) {
  const attendeeIds = event.event_friends.map((ef) => ef.friend_id);
  const attendees = friends.filter((f) => attendeeIds.includes(f.id));
  const past = isPast(event.date);

  const accentColor = past ? colors.textMuted : colors.blue;

  const visibleAttendees = attendees.slice(0, 3);
  const overflow = attendees.length - visibleAttendees.length;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{event.name}</Text>
          {past && (
            <View style={styles.pastBadge}>
              <Text style={styles.pastBadgeText}>PAST</Text>
            </View>
          )}
        </View>

        <Text style={[styles.date, { color: accentColor }]}>{formatDate(event.date)}</Text>

        {attendees.length > 0 ? (
          <View style={styles.attendeePills}>
            {visibleAttendees.map((f) => (
              <View key={f.id} style={styles.pill}>
                <Text style={styles.pillText} numberOfLines={1}>{f.name}</Text>
              </View>
            ))}
            {overflow > 0 && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>+{overflow} more</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noAttendees}>No friends added yet</Text>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.attendeeCount}>
            {attendees.length} {attendees.length === 1 ? 'friend' : 'friends'}
          </Text>
          <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>✕</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  accent: { width: 4 },
  body: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 6,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '600', color: colors.primary, flexShrink: 1 },
  pastBadge: { backgroundColor: colors.bgInput, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  pastBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  date: { fontSize: 13, fontWeight: '500' },
  attendeePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: colors.blueBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '600', color: colors.blueMid },
  noAttendees: { fontSize: 13, color: colors.textMuted },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  attendeeCount: { fontSize: 13, color: colors.textMuted },
  deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  deleteBtnText: { fontSize: 16, color: colors.borderMuted },
});
