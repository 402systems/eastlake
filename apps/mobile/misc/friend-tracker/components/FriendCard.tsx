import { View, Text, Pressable, StyleSheet } from 'react-native';
import { getDaysSince, getUrgencyColor } from '../hooks/useFriends';
import { config } from '../tracker.config';
import type { Friend } from '../hooks/useFriends';
import { colors } from '../utils/colors';

interface FriendCardProps {
  friend: Friend;
  onPress: (id: string) => void;
  onHangout: (id: string) => void;
  onDelete: (id: string) => void;
  onAssignGroups: (friendId: string) => void;
}

function getBadgeLabel(days: number): string | null {
  const { checkin, soon, overdue } = config.urgencyThresholds;
  if (days >= 999) return config.neverLabel;
  if (days >= overdue) return 'Overdue';
  if (days >= soon) return 'Soon';
  if (days >= checkin) return 'Check in';
  return null;
}

function getDaysLabel(days: number): string {
  if (days >= 999) return 'Never hung out';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function FriendCard({
  friend,
  onPress,
  onHangout,
  onDelete,
  onAssignGroups,
}: FriendCardProps) {
  const days = getDaysSince(friend.last_action);
  const urgencyColor = getUrgencyColor(days);
  const badge = getBadgeLabel(days);
  const daysLabel = getDaysLabel(days);

  return (
    <Pressable style={styles.card} onPress={() => onPress(friend.id)}>
      <View style={[styles.accent, { backgroundColor: urgencyColor }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{friend.name}</Text>
          {badge && (
            <View style={[styles.badge, { backgroundColor: urgencyColor + '18' }]}>
              <Text style={[styles.badgeText, { color: urgencyColor }]}>{badge}</Text>
            </View>
          )}
        </View>

        {(friend.phone_number || friend.birthday) && (
          <View style={styles.detailRow}>
            {friend.phone_number && (
              <Text style={styles.detailText} numberOfLines={1}>📞 {friend.phone_number}</Text>
            )}
            {friend.birthday && (
              <Text style={styles.detailText} numberOfLines={1}>🎂 {friend.birthday}</Text>
            )}
          </View>
        )}

        {friend.groups && friend.groups.length > 0 && (
          <View style={styles.groupPills}>
            {friend.groups.map((g) => (
              <View key={g} style={styles.groupPill}>
                <Text style={styles.groupPillText}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomRow}>
          <Text style={styles.daysLabel}>{daysLabel}</Text>
          <View style={styles.actions}>
            <Pressable onPress={() => onAssignGroups(friend.id)} style={styles.tagBtn} hitSlop={8}>
              <Text style={styles.tagBtnText}>🏷</Text>
            </Pressable>
            <Pressable onPress={() => onHangout(friend.id)} style={styles.hangoutBtn}>
              <Text style={styles.hangoutBtnText}>{config.actionLabel}</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(friend.id)} style={styles.deleteBtn} hitSlop={8}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </Pressable>
          </View>
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
  body: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: 12, gap: 8 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 17, fontWeight: '600', color: colors.primary, flexShrink: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase' },

  detailRow: { flexDirection: 'row', gap: 12 },
  detailText: { fontSize: 12, color: colors.textTertiary },

  groupPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  groupPill: { backgroundColor: colors.violetBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  groupPillText: { fontSize: 11, fontWeight: '600', color: colors.violet },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  daysLabel: { fontSize: 13, color: colors.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  tagBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: colors.bgInput },
  tagBtnText: { fontSize: 14 },
  hangoutBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  hangoutBtnText: { color: colors.bgCard, fontSize: 13, fontWeight: '600' },
  deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  deleteBtnText: { fontSize: 16, color: colors.borderMuted },
});
