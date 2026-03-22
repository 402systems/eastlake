import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@402systems/lib-core-supabase-auth/native/hooks/useAuth';
import { useFriends } from '../hooks/useFriends';
import { useGroups } from '../hooks/useGroups';
import { FriendCard } from '../components/FriendCard';
import { GroupTabs } from '../components/GroupTabs';
import { AddFriendModal } from '../components/AddFriendModal';
import { AuthModal } from '../components/AuthModal';
import { ContactPickerModal } from '../components/ContactPickerModal';
import { ManageGroupsModal } from '../components/ManageGroupsModal';
import { AssignGroupsModal } from '../components/AssignGroupsModal';
import { config } from '../tracker.config';
import type { Friend } from '../hooks/useFriends';

export default function HomeScreen() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const {
    friends,
    isLoadingFriends,
    error,
    addFriend,
    recordHangout,
    deleteFriend,
    setFriends,
  } = useFriends({ user, loading });
  const {
    groups,
    activeGroup,
    setActiveGroup,
    deleteGroup,
    addFriendToGroup,
    removeFriendFromGroup,
  } = useGroups({ user, friends });
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [contactPickerVisible, setContactPickerVisible] = useState(false);
  const [manageGroupsVisible, setManageGroupsVisible] = useState(false);
  const [assignGroupsFriend, setAssignGroupsFriend] = useState<Friend | null>(
    null
  );

  const filteredFriends = activeGroup
    ? friends.filter((f) => f.groups?.includes(activeGroup))
    : friends;

  const { singular, plural } = config.itemNoun;
  const countLabel =
    filteredFriends.length === 0 && !isLoadingFriends
      ? `No ${plural} yet`
      : `${filteredFriends.length} ${filteredFriends.length !== 1 ? plural : singular}`;

  const handleImportContacts = async (
    friends: {
      name: string;
      phone_number?: string | null;
      birthday?: string | null;
    }[]
  ) => {
    for (const friend of friends) {
      await addFriend(friend);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{config.appTitle}</Text>
          <Text style={styles.subtitle}>{config.appDescription}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#94a3b8" />
        ) : user ? (
          <Pressable onPress={() => signOut()} style={styles.userPill}>
            <Text style={styles.userPillText}>{user.email?.split('@')[0]}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => setAuthModalVisible(true)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </Pressable>
        )}
      </View>

      {/* ── Error ── */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* ── Signed-out state ── */}
      {!user && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👋</Text>
          <Text style={styles.emptyTitle}>Track your friendships</Text>
          <Text style={styles.emptyBody}>
            Sign in to see who you haven&apos;t hung out with lately.
          </Text>
          <Pressable
            onPress={() => setAuthModalVisible(true)}
            style={styles.primaryButtonLg}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
          </Pressable>
        </View>
      )}

      {/* ── Friend list ── */}
      {user && (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listCount}>{countLabel}</Text>
            <View style={styles.listHeaderButtons}>
              <Pressable
                onPress={() => setContactPickerVisible(true)}
                style={({ pressed }) => [
                  styles.headerBtn,
                  styles.importButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.importButtonText}>📇 Import</Text>
              </Pressable>
              <Pressable
                onPress={() => setAddModalVisible(true)}
                style={({ pressed }) => [
                  styles.headerBtn,
                  styles.addButton,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.addButtonText}>+ Add</Text>
              </Pressable>
            </View>
          </View>

          <GroupTabs
            groups={groups}
            activeGroup={activeGroup}
            onSelect={setActiveGroup}
            onManage={() => setManageGroupsVisible(true)}
          />

          {isLoadingFriends ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#94a3b8" />
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🫂</Text>
              <Text style={styles.emptyBody}>
                Add your first friend to start tracking.
              </Text>
              <Pressable
                onPress={() => setAddModalVisible(true)}
                style={({ pressed }) => [
                  styles.bigAddButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.bigAddButtonText}>+ Add a friend</Text>
              </Pressable>
              <Pressable
                onPress={() => setContactPickerVisible(true)}
                style={({ pressed }) => [
                  styles.bigImportButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text style={styles.bigImportButtonText}>
                  Import from contacts
                </Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={filteredFriends}
              keyExtractor={(f) => f.id}
              renderItem={({ item }) => (
                <FriendCard
                  friend={item}
                  onHangout={recordHangout}
                  onDelete={deleteFriend}
                  onAssignGroups={(id) => {
                    const f = friends.find((fr) => fr.id === id);
                    if (f) setAssignGroupsFriend(f);
                  }}
                />
              )}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      <AddFriendModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAdd={addFriend}
      />
      <AuthModal
        visible={authModalVisible}
        onClose={() => setAuthModalVisible(false)}
        onSignIn={signIn}
        onSignUp={signUp}
      />
      <ContactPickerModal
        visible={contactPickerVisible}
        onClose={() => setContactPickerVisible(false)}
        onImport={handleImportContacts}
        existingNames={friends.map((f) => f.name)}
      />
      <ManageGroupsModal
        visible={manageGroupsVisible}
        onClose={() => setManageGroupsVisible(false)}
        groups={groups}
        onDelete={async (name) => {
          const deletedName = await deleteGroup(name);
          if (deletedName) {
            setFriends((prev) =>
              prev.map((f) =>
                f.groups?.includes(deletedName)
                  ? { ...f, groups: f.groups.filter((g) => g !== deletedName) }
                  : f
              )
            );
          }
          return deletedName;
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
            setFriends((prev) =>
              prev.map((f) =>
                f.id === friendId ? { ...f, groups: updated } : f
              )
            );
            setAssignGroupsFriend((prev) =>
              prev?.id === friendId ? { ...prev, groups: updated } : prev
            );
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },

  // User pill / buttons
  userPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  userPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  primaryButton: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  primaryButtonLg: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Error
  errorBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
  },

  // List header
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  listHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  listCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  headerBtn: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  importButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  importButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  addButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  bigAddButton: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 16,
  },
  bigAddButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
  },
  bigImportButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 10,
  },
  bigImportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
