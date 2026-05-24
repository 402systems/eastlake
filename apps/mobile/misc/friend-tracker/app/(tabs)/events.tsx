import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext, type AppEvent } from '../../context/AppContext';
import { EventCard } from '../../components/EventCard';
import { CreateEventModal } from '../../components/CreateEventModal';
import { EventDetailModal } from '../../components/EventDetailModal';
import { isPast } from '../../utils/date';
import { colors } from '../../utils/colors';

export default function EventsScreen() {
  const {
    events,
    isLoadingEvents,
    friends,
    createEvent,
    updateEvent,
    deleteEvent,
    addFriendsToEvent,
    removeFriendFromEvent,
    recordHangout,
    refresh,
    isRefreshing,
  } = useAppContext();

  const [createVisible, setCreateVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AppEvent | null>(null);

  const upcoming = events.filter((e) => !isPast(e.date));
  const past = events.filter((e) => isPast(e.date));

  const sections = [
    ...(upcoming.length > 0
      ? [{ type: 'header', key: 'upcoming-header', label: 'Upcoming' } as const]
      : []),
    ...upcoming.map((e) => ({ type: 'event', key: e.id, event: e }) as const),
    ...(past.length > 0
      ? [{ type: 'header', key: 'past-header', label: 'Past' } as const]
      : []),
    ...past.map((e) => ({ type: 'event', key: e.id, event: e }) as const),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={refresh} disabled={isRefreshing} style={styles.refreshBtn}>
            {isRefreshing
              ? <ActivityIndicator size="small" color={colors.textMuted} />
              : <Ionicons name="reload-outline" size={18} color={colors.textMuted} />}
          </Pressable>
          <Pressable onPress={() => setCreateVisible(true)} style={styles.newBtn}>
            <Text style={styles.newBtnText}>+ New</Text>
          </Pressable>
        </View>
      </View>

      {isLoadingEvents ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>No events yet</Text>
          <Text style={styles.emptyBody}>
            Create an event and invite your friends.
          </Text>
          <Pressable
            onPress={() => setCreateVisible(true)}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnText}>+ Create event</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionLabel}>{item.label}</Text>;
            }
            return (
              <EventCard
                event={item.event}
                friends={friends}
                onPress={() => setSelectedEvent(item.event)}
                onDelete={() => deleteEvent(item.event.id)}
              />
            );
          }}
        />
      )}

      <CreateEventModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreate={createEvent}
      />

      <EventDetailModal
        key={selectedEvent?.id ?? 'none'}
        visible={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        friends={friends}
        onUpdate={updateEvent}
        onAddFriends={addFriendsToEvent}
        onRemoveFriend={removeFriendFromEvent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgScreen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: { padding: 6 },
  newBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newBtnText: { fontSize: 14, fontWeight: '600', color: colors.bgCard },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 16,
  },
  emptyBtnText: { fontSize: 17, fontWeight: '600', color: colors.bgCard },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingTop: 8,
    paddingBottom: 4,
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 4 },
});
