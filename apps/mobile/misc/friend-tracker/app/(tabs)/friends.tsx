import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import type { Friend } from '../../context/AppContext';
import { FriendCard } from '../../components/FriendCard';
import { GroupTabs } from '../../components/GroupTabs';
import { AddFriendModal } from '../../components/AddFriendModal';
import { ContactPickerModal } from '../../components/ContactPickerModal';
import { ManageGroupsModal } from '../../components/ManageGroupsModal';
import { AssignGroupsModal } from '../../components/AssignGroupsModal';
import { FriendDetailModal } from '../../components/FriendDetailModal';
import { getDaysSince } from '../../hooks/useFriends';
import { colors } from '../../utils/colors';

const Separator = () => <View style={{ height: 10 }} />;

export default function FriendsScreen() {
  const {
    user,
    signOut,
    friends,
    isLoadingFriends,
    error,
    clearError,
    addFriend,
    addFriends,
    recordHangout,
    deleteFriend,
    addFriendToGroup,
    removeFriendFromGroup,
    deleteGroup,
    updateFriendGroupsLocally,
    refresh,
    isRefreshing,
  } = useAppContext();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const [manageGroupsVisible, setManageGroupsVisible] = useState(false);
  const [assignGroupsFriend, setAssignGroupsFriend] = useState<Friend | null>(
    null
  );
  const [detailFriend, setDetailFriend] = useState<Friend | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handlePress = useCallback((friend: Friend) => {
    setDetailFriend(friend);
  }, []);

  const handleAssignGroups = useCallback((friend: Friend) => {
    setAssignGroupsFriend(friend);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Friend }) => (
      <FriendCard
        friend={item}
        onPress={handlePress}
        onHangout={recordHangout}
        onDelete={deleteFriend}
        onAssignGroups={handleAssignGroups}
      />
    ),
    [handlePress, handleAssignGroups, recordHangout, deleteFriend]
  );

  const groups = useMemo(
    () => [...new Set(friends.flatMap((f) => f.groups ?? []))].sort(),
    [friends]
  );

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);
    return friends.filter((f) => {
      if (!f.birthday) return false;
      const parts = f.birthday.split('-');
      if (parts.length < 3) return false;
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const bday = new Date(today.getFullYear(), month, day);
      if (bday < today) bday.setFullYear(today.getFullYear() + 1);
      return bday <= in7Days;
    });
  }, [friends]);

  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const dA =
          a.last_action === null ? Infinity : getDaysSince(a.last_action);
        const dB =
          b.last_action === null ? Infinity : getDaysSince(b.last_action);
        return dB - dA;
      }),
    [friends]
  );

  const filteredFriends = useMemo(() => {
    let result = sortedFriends;
    if (activeGroup)
      result = result.filter((f) => f.groups?.includes(activeGroup));
    if (searchQuery.trim())
      result = result.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return result;
  }, [sortedFriends, activeGroup, searchQuery]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.headerRight}>
          <Pressable
            onPress={refresh}
            disabled={isRefreshing}
            style={styles.refreshBtn}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : (
              <Ionicons
                name="reload-outline"
                size={18}
                color={colors.textMuted}
              />
            )}
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert('Sign out', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Sign out',
                  style: 'destructive',
                  onPress: () => signOut(),
                },
              ])
            }
            style={styles.userPill}
          >
            <Text style={styles.userPillText}>
              {user?.email?.split('@')[0]}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Error banner */}
      {error && (
        <Pressable style={styles.errorBanner} onPress={clearError}>
          <Text style={styles.errorText}>{error}</Text>
          <Ionicons name="close" size={14} color={colors.error} />
        </Pressable>
      )}

      {/* Birthday banner */}
      {upcomingBirthdays.length > 0 && (
        <View style={styles.birthdayBanner}>
          <Text style={styles.birthdayText}>
            🎂 {upcomingBirthdays.map((f) => f.name).join(', ')}{' '}
            {upcomingBirthdays.length === 1 ? 'has' : 'have'} a birthday this
            week
          </Text>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons
          name="search-outline"
          size={16}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends…"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Group filter */}
      <GroupTabs
        groups={groups}
        activeGroup={activeGroup}
        onSelect={setActiveGroup}
        onManage={() => setManageGroupsVisible(true)}
      />

      {/* Count */}
      {friends.length > 0 && (
        <Text style={styles.countLabel}>
          {filteredFriends.length}{' '}
          {filteredFriends.length !== 1 ? 'friends' : 'friend'}
        </Text>
      )}

      {/* List / empty state */}
      {isLoadingFriends ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : friends.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🫂</Text>
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptyBody}>
            Add your first friend to start tracking.
          </Text>
          <Pressable
            onPress={() => setAddModalVisible(true)}
            style={styles.emptyPrimaryBtn}
          >
            <Text style={styles.emptyPrimaryBtnText}>+ Add a friend</Text>
          </Pressable>
          <Pressable
            onPress={() => setContactPickerVisible(true)}
            style={styles.emptySecondaryBtn}
          >
            <Text style={styles.emptySecondaryBtnText}>
              Import from contacts
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(f) => f.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={Separator}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          windowSize={5}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* FAB */}
      {friends.length > 0 && (
        <>
          {fabExpanded && (
            <Pressable
              style={styles.fabBackdrop}
              onPress={() => setFabExpanded(false)}
            />
          )}
          <View style={styles.fabContainer}>
            {fabExpanded && (
              <>
                <Pressable
                  style={styles.fabOption}
                  onPress={() => {
                    setFabExpanded(false);
                    setContactPickerVisible(true);
                  }}
                >
                  <Text style={styles.fabOptionText}>Import from contacts</Text>
                </Pressable>
                <Pressable
                  style={styles.fabOption}
                  onPress={() => {
                    setFabExpanded(false);
                    setAddModalVisible(true);
                  }}
                >
                  <Text style={styles.fabOptionText}>Add friend</Text>
                </Pressable>
              </>
            )}
            <Pressable
              onPress={() => setFabExpanded((v) => !v)}
              style={styles.fab}
            >
              <Ionicons
                name={fabExpanded ? 'close' : 'add'}
                size={28}
                color="#fff"
              />
            </Pressable>
          </View>
        </>
      )}

      <AddFriendModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={addFriend}
      />
      <ContactPickerModal
        visible={contactPickerVisible}
        onClose={() => setContactPickerVisible(false)}
        onImport={addFriends}
        existingNames={friends.map((f) => f.name)}
      />
      <ManageGroupsModal
        visible={manageGroupsVisible}
        onClose={() => setManageGroupsVisible(false)}
        groups={groups}
        onDelete={async (name) => {
          const deleted = await deleteGroup(name);
          if (deleted && activeGroup === deleted) setActiveGroup(null);
          return deleted;
        }}
      />
      <AssignGroupsModal
        visible={!!assignGroupsFriend}
        onClose={() => setAssignGroupsFriend(null)}
        friend={assignGroupsFriend}
        groups={groups}
        onToggle={async (friendId, groupName, isMember) => {
          const updated = isMember
            ? await removeFriendFromGroup(friendId, groupName)
            : await addFriendToGroup(friendId, groupName);
          if (updated) {
            updateFriendGroupsLocally(friendId, updated);
            setAssignGroupsFriend((prev) =>
              prev?.id === friendId ? { ...prev, groups: updated } : prev
            );
          }
        }}
      />
      <FriendDetailModal
        visible={!!detailFriend}
        onClose={() => setDetailFriend(null)}
        friend={detailFriend}
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
  userPill: {
    backgroundColor: colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  userPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.errorBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13, color: colors.error, flex: 1 },

  birthdayBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.warningBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  birthdayText: { fontSize: 13, color: colors.warningText },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.primary,
  },

  countLabel: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 11,
    marginBottom: 16,
  },
  emptyPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.bgCard,
  },
  emptySecondaryBtn: {
    backgroundColor: colors.bgInput,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  emptySecondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  fabBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    alignItems: 'flex-end',
    gap: 10,
    zIndex: 11,
  },
  fabOption: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  fabOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.indigo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
});
