import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { FriendPickerModal } from './FriendPickerModal';
import type { AppEvent, Friend } from '../context/AppContext';
import { formatDate } from '../utils/date';
import { colors } from '../utils/colors';

interface EventDetailModalProps {
  visible: boolean;
  onClose: () => void;
  event: AppEvent | null;
  friends: Friend[];
  onUpdate: (id: string, changes: { name?: string; date?: string }) => void;
  onAddFriends: (eventId: string, friendIds: string[]) => void;
  onRemoveFriend: (eventId: string, friendId: string) => void;
  onRecordHangout: (friendId: string) => void;
}

export function EventDetailModal({
  visible,
  onClose,
  event,
  friends,
  onUpdate,
  onAddFriends,
  onRemoveFriend,
  onRecordHangout,
}: EventDetailModalProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (visible && event) {
      setEditingName(false);
      setEditingDate(false);
      setNameValue(event.name);
      setDateValue(event.date);
    }
  }, [visible, event?.id]); /* eslint-enable react-hooks/set-state-in-effect */

  if (!event) return null;

  const attendeeIds = event.event_friends.map((ef) => ef.friend_id);
  const attendees = friends.filter((f) => attendeeIds.includes(f.id));

  const saveName = () => {
    if (nameValue.trim() && nameValue.trim() !== event.name) {
      onUpdate(event.id, { name: nameValue.trim() });
    }
    setEditingName(false);
  };

  const saveDate = () => {
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(dateValue.trim()) &&
      dateValue.trim() !== event.date
    ) {
      onUpdate(event.id, { date: dateValue.trim() });
    }
    setEditingDate(false);
  };

  const handleAddFriends = (selectedIds: string[]) => {
    const newIds = selectedIds.filter((id) => !attendeeIds.includes(id));
    if (newIds.length > 0) onAddFriends(event.id, newIds);
  };

  return (
    <>
      <RNModal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0,0,0,0.25)',
          }}
        >
          <Pressable
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            onPress={onClose}
          />

          <View
            style={{
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 24,
              paddingTop: 24,
              paddingBottom: 40,
              maxHeight: '80%',
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: colors.primary,
                }}
              >
                Event Details
              </Text>
              <Pressable onPress={onClose} style={{ padding: 4 }}>
                <Text style={{ fontSize: 20, color: colors.textMuted }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Name */}
              <View style={{ marginBottom: 12 }}>
                {editingName ? (
                  <TextInput
                    style={{
                      backgroundColor: colors.bgInput,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 15,
                      color: colors.primary,
                      borderWidth: 2,
                      borderColor: colors.primary,
                    }}
                    value={nameValue}
                    onChangeText={setNameValue}
                    onBlur={saveName}
                    onSubmitEditing={saveName}
                    autoFocus
                  />
                ) : (
                  <Pressable
                    onPress={() => setEditingName(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.bgScreen,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: '600',
                        color: colors.primary,
                        flex: 1,
                      }}
                    >
                      {event.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      Edit
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Date */}
              <View style={{ marginBottom: 16 }}>
                {editingDate ? (
                  <TextInput
                    style={{
                      backgroundColor: colors.bgInput,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      fontSize: 15,
                      color: colors.primary,
                      borderWidth: 2,
                      borderColor: colors.primary,
                    }}
                    value={dateValue}
                    onChangeText={setDateValue}
                    onBlur={saveDate}
                    onSubmitEditing={saveDate}
                    keyboardType="numbers-and-punctuation"
                    autoFocus
                  />
                ) : (
                  <Pressable
                    onPress={() => setEditingDate(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.bgScreen,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 15,
                        color: colors.blue,
                        fontWeight: '500',
                        flex: 1,
                      }}
                    >
                      {formatDate(event.date)}
                    </Text>
                    <Text style={{ fontSize: 13, color: colors.textMuted }}>
                      Edit
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Attendees header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '600',
                    color: colors.textSecondary,
                  }}
                >
                  Friends ({attendees.length})
                </Text>
                <Pressable
                  onPress={() => setPickerVisible(true)}
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: colors.bgCard,
                    }}
                  >
                    + Add
                  </Text>
                </Pressable>
              </View>

              {/* Attendees list */}
              {attendees.length === 0 ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textMuted,
                    textAlign: 'center',
                    paddingVertical: 16,
                  }}
                >
                  No friends added yet
                </Text>
              ) : (
                attendees.map((item, i) => (
                  <View key={item.id}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                      }}
                    >
                      <Text
                        style={{ fontSize: 15, color: colors.primary, flex: 1 }}
                      >
                        {item.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <Pressable
                          onPress={() => onRecordHangout(item.id)}
                          style={{
                            backgroundColor: colors.primary,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '600',
                              color: colors.bgCard,
                            }}
                          >
                            Hung out
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => onRemoveFriend(event.id, item.id)}
                          hitSlop={8}
                          style={{
                            width: 28,
                            height: 28,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Text style={{ fontSize: 16, color: colors.danger }}>
                            ✕
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                    {i < attendees.length - 1 && (
                      <View
                        style={{ height: 1, backgroundColor: colors.bgInput }}
                      />
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </RNModal>

      <FriendPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        friends={friends.filter((f) => !attendeeIds.includes(f.id))}
        selectedIds={[]}
        onConfirm={handleAddFriends}
        title="Add Friends to Event"
      />
    </>
  );
}
