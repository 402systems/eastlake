import { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

import { GroupCard } from '../../components/GroupCard';
import { CreateGroupModal } from '../../components/CreateGroupModal';
import { colors } from '../../utils/colors';

export default function GroupsScreen() {
  const { friends, isLoadingFriends, addFriendToGroup, removeFriendFromGroup, deleteGroup, refresh, isRefreshing } =
    useAppContext();

  const [createModalVisible, setCreateModalVisible] = useState(false);

  const groups = useMemo(
    () => [...new Set(friends.flatMap((f) => f.groups ?? []))].sort(),
    [friends]
  );

  const handleRemoveMember = async (groupName: string, friendId: string) => {
    await removeFriendFromGroup(friendId, groupName);
  };

  const handleDeleteGroup = async (groupName: string) => {
    await deleteGroup(groupName);
  };

  const handleCreateGroup = async (groupName: string, friendIds: string[]) => {
    await Promise.all(friendIds.map((id) => addFriendToGroup(id, groupName)));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <Pressable onPress={refresh} disabled={isRefreshing} style={styles.refreshBtn}>
          {isRefreshing
            ? <ActivityIndicator size="small" color={colors.textMuted} />
            : <Ionicons name="reload-outline" size={18} color={colors.textMuted} />}
        </Pressable>
      </View>

      {isLoadingFriends ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏷️</Text>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptyBody}>
            Tap + to create a group and add friends to it.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item: groupName }) => {
            const members = friends.filter((f) =>
              f.groups?.includes(groupName)
            );
            return (
              <GroupCard
                name={groupName}
                members={members}
                allFriends={friends}
                onDelete={() => handleDeleteGroup(groupName)}
                onRemoveMember={(friendId) =>
                  handleRemoveMember(groupName, friendId)
                }
                onAddMembers={(friendIds) =>
                  Promise.all(
                    friendIds.map((id) => addFriendToGroup(id, groupName))
                  )
                }
              />
            );
          }}
        />
      )}

      <Pressable
        onPress={() => setCreateModalVisible(true)}
        style={styles.fab}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <CreateGroupModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        friends={friends}
        onCreate={handleCreateGroup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgScreen },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  refreshBtn: { padding: 6 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
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
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
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
