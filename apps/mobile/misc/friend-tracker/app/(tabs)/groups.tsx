import { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '../../context/AppContext';
import { GroupCard } from '../../components/GroupCard';
import { colors } from '../../utils/colors';

export default function GroupsScreen() {
  const {
    friends,
    isLoadingFriends,
    addFriendToGroup,
    removeFriendFromGroup,
    deleteGroup,
  } = useAppContext();

  const [newGroupName, setNewGroupName] = useState('');

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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
      </View>

      <Text style={styles.hint}>
        Assign groups to friends from the Friends tab using the 🏷 button.
      </Text>

      {isLoadingFriends ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🏷️</Text>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptyBody}>
            Tag friends with groups from the Friends tab to organize them here.
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
            const members = friends.filter((f) => f.groups?.includes(groupName));
            return (
              <GroupCard
                name={groupName}
                members={members}
                onDelete={() => handleDeleteGroup(groupName)}
                onRemoveMember={(friendId) => handleRemoveMember(groupName, friendId)}
              />
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgScreen },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: colors.primary, letterSpacing: -0.5 },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: colors.primary, marginBottom: 6 },
  emptyBody: { fontSize: 15, color: colors.textMuted, textAlign: 'center', lineHeight: 22 },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
});
