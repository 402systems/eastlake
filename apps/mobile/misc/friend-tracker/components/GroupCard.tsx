import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { Friend } from '../context/AppContext';
import { FriendPickerModal } from './FriendPickerModal';
import { colors } from '../utils/colors';

interface GroupCardProps {
  name: string;
  members: Friend[];
  allFriends: Friend[];
  onDelete: () => void;
  onRemoveMember: (friendId: string) => void;
  onAddMembers: (friendIds: string[]) => void;
}

export function GroupCard({
  name,
  members,
  allFriends,
  onDelete,
  onRemoveMember,
  onAddMembers,
}: GroupCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  const nonMembers = allFriends.filter(
    (f) => !members.some((m) => m.id === f.id)
  );

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.body}>
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={styles.headerRow}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.count}>
              {members.length} {members.length === 1 ? 'friend' : 'friends'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
            <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </Pressable>
          </View>
        </Pressable>

        {expanded && (
          <View style={styles.memberList}>
            {members.length === 0 ? (
              <Text style={styles.emptyText}>No members</Text>
            ) : (
              members.map((f, i) => (
                <View
                  key={f.id}
                  style={[
                    styles.memberRow,
                    i < members.length - 1 && styles.memberBorder,
                  ]}
                >
                  <Text style={styles.memberName}>{f.name}</Text>
                  <Pressable onPress={() => onRemoveMember(f.id)} hitSlop={8}>
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              ))
            )}
            {nonMembers.length > 0 && (
              <Pressable
                onPress={() => setPickerVisible(true)}
                style={styles.addFriendsBtn}
              >
                <Text style={styles.addFriendsBtnText}>+ Add friends</Text>
              </Pressable>
            )}
          </View>
        )}

        <FriendPickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          friends={nonMembers}
          selectedIds={[]}
          onConfirm={onAddMembers}
          title={`Add to ${name}`}
        />
      </View>
    </View>
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
  accent: { width: 4, backgroundColor: colors.violet },
  body: { flex: 1, paddingVertical: 14, paddingLeft: 14, paddingRight: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: colors.primary },
  count: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chevron: { fontSize: 11, color: colors.textMuted },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { fontSize: 16, color: colors.borderMuted },
  memberList: { marginTop: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  memberBorder: { borderBottomWidth: 1, borderBottomColor: colors.bgInput },
  memberName: { fontSize: 15, color: colors.primary, flex: 1 },
  removeText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  emptyText: { fontSize: 14, color: colors.textMuted, paddingVertical: 8 },
  addFriendsBtn: { paddingVertical: 10, alignSelf: 'flex-start' },
  addFriendsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.indigo,
  },
});
