import { useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Modal } from '@402systems/lib-core-ui/native/components/Modal';
import { useAppContext } from '../context/AppContext';
import type { Friend } from '../context/AppContext';
import { formatDate, isPast } from '../utils/date';
import { colors } from '../utils/colors';

interface FriendDetailModalProps {
  visible: boolean;
  onClose: () => void;
  friend: Friend | null;
}

export function FriendDetailModal({ visible, onClose, friend }: FriendDetailModalProps) {
  const { events } = useAppContext();

  const friendEvents = useMemo(() => {
    if (!friend) return [];
    return events
      .filter((e) => e.event_friends.some((ef) => ef.friend_id === friend.id))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [events, friend]);

  const pastEvents = friendEvents.filter((e) => isPast(e.date));
  const upcomingEvents = friendEvents.filter((e) => !isPast(e.date));

  if (!friend) return null;

  return (
    <Modal visible={visible} onClose={onClose} title={friend.name}>
      <View style={{ maxHeight: 360 }}>
        {friendEvents.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
            <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center' }}>
              No events with {friend.name} yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={[
              ...(upcomingEvents.length > 0 ? [{ type: 'header' as const, label: 'Upcoming' }] : []),
              ...upcomingEvents.map((e) => ({ type: 'event' as const, event: e })),
              ...(pastEvents.length > 0 ? [{ type: 'header' as const, label: 'Past' }] : []),
              ...pastEvents.map((e) => ({ type: 'event' as const, event: e })),
            ]}
            keyExtractor={(item, i) => (item.type === 'header' ? `h-${item.label}` : item.event.id)}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (item.type === 'header') {
                return (
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    paddingTop: 12,
                    paddingBottom: 6,
                  }}>
                    {item.label}
                  </Text>
                );
              }
              const e = item.event;
              const past = isPast(e.date);
              return (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.bgInput,
                }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: past ? colors.borderMuted : colors.indigo,
                    marginRight: 12,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '600',
                      color: past ? colors.textMuted : colors.primary,
                    }}>
                      {e.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                      {formatDate(e.date)}
                      {e.event_friends.length > 1
                        ? ` · ${e.event_friends.length - 1} other${e.event_friends.length - 1 !== 1 ? 's' : ''}`
                        : ''}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      {friend.last_action && (
        <Text style={{ fontSize: 12, color: colors.borderMuted, textAlign: 'center' }}>
          Last hung out: {formatDate(friend.last_action)}
        </Text>
      )}
    </Modal>
  );
}
