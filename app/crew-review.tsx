import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { UserProfile } from '@/lib/types';
import * as Haptics from 'expo-haptics';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontSize: 20,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
      textAlign: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      gap: 16,
    },
    projectSection: {
      gap: 8,
    },
    sectionLabel: {
      fontSize: 11,
      color: C.textTertiary,
      fontFamily: 'DMSans_600SemiBold',
      letterSpacing: 1,
      marginTop: 4,
    },
    projectNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    projectName: {
      fontSize: 22,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
    },
    editNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    nameInput: {
      flex: 1,
      fontSize: 20,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
      borderBottomWidth: 1,
      borderBottomColor: C.primary,
      paddingVertical: 4,
    },
    saveNameBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(52, 199, 89, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    budgetCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    budgetRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    budgetItem: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    budgetValue: {
      fontSize: 20,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
    },
    budgetLabel: {
      fontSize: 11,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    budgetDivider: {
      width: 1,
      height: 40,
      backgroundColor: C.border,
    },
    roleGroup: {
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
    },
    roleHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: 'rgba(212, 168, 83, 0.06)',
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    roleName: {
      fontSize: 14,
      color: C.primary,
      fontFamily: 'DMSans_700Bold',
    },
    roleRate: {
      fontSize: 12,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 14,
      color: C.text,
      fontFamily: 'DMSans_600SemiBold',
    },
    memberExp: {
      fontSize: 11,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
      marginTop: 1,
    },
    memberRight: {
      alignItems: 'flex-end',
      gap: 2,
    },
    miniRating: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    miniRatingText: {
      fontSize: 11,
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
    memberRate: {
      fontSize: 11,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    messageSection: {
      gap: 8,
    },
    messageInput: {
      backgroundColor: C.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      padding: 14,
      minHeight: 120,
      fontSize: 14,
      color: C.text,
      fontFamily: 'DMSans_400Regular',
      lineHeight: 20,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 14,
      backgroundColor: C.surface,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    editBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: C.surfaceLight,
    },
    editBtnText: {
      fontSize: 14,
      color: C.textSecondary,
      fontFamily: 'DMSans_600SemiBold',
    },
    inviteBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: C.primary,
    },
    inviteBtnText: {
      fontSize: 14,
      color: C.background,
      fontFamily: 'DMSans_700Bold',
    },
    successContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      gap: 16,
    },
    successIcon: {
      marginBottom: 8,
    },
    successTitle: {
      fontSize: 24,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
    },
    successText: {
      fontSize: 14,
      color: C.textSecondary,
      fontFamily: 'DMSans_400Regular',
      textAlign: 'center',
      lineHeight: 22,
    },
    doneBtn: {
      marginTop: 16,
      paddingHorizontal: 40,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: C.primary,
    },
    doneBtnText: {
      fontSize: 16,
      color: C.background,
      fontFamily: 'DMSans_700Bold',
    },
  });
}

export default function CrewReviewScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const {
    crewBasket,
    profiles,
    crewProjectName,
    setCrewProjectName,
    clearCrewBasket,
  } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;
  const [message, setMessage] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(crewProjectName);
  const [inviteSent, setInviteSent] = useState(false);

  const profileMap = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  const crewMembers = useMemo(() => {
    return crewBasket.map(item => ({
      ...item,
      profile: profileMap[item.profileId],
    })).filter(item => item.profile);
  }, [crewBasket, profileMap]);

  const roleGroups = useMemo(() => {
    const grouped: Record<string, typeof crewMembers> = {};
    for (const m of crewMembers) {
      if (!grouped[m.assignedRole]) grouped[m.assignedRole] = [];
      grouped[m.assignedRole].push(m);
    }
    return grouped;
  }, [crewMembers]);

  const totalBudget = useMemo(() => {
    return crewMembers.reduce((sum, m) => sum + (m.profile?.dayRate || 0), 0);
  }, [crewMembers]);

  const formatBudget = (amount: number) => {
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return `${amount}`;
  };

  const handleSendInvites = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setInviteSent(true);
  };

  const handleDone = () => {
    clearCrewBasket();
    router.dismissAll();
  };

  if (inviteSent) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color="#34C759" />
          </View>
          <Text style={styles.successTitle}>Invites Sent</Text>
          <Text style={styles.successText}>
            Bulk invitations have been sent to {crewMembers.length} crew members for "{crewProjectName}".
            They will receive your message and can respond through the app.
          </Text>
          <Pressable onPress={handleDone} style={styles.doneBtn} testID="done-btn">
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Review & Invite</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === 'web' ? 34 + 100 : 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.projectSection}>
          <Text style={styles.sectionLabel}>PROJECT NAME</Text>
          {editingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.nameInput}
                value={tempName}
                onChangeText={setTempName}
                autoFocus
                placeholderTextColor={C.textTertiary}
              />
              <Pressable
                onPress={() => {
                  if (tempName.trim()) {
                    setCrewProjectName(tempName.trim());
                  }
                  setEditingName(false);
                }}
                style={styles.saveNameBtn}
              >
                <Ionicons name="checkmark" size={18} color="#34C759" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setTempName(crewProjectName);
                setEditingName(true);
              }}
              style={styles.projectNameRow}
              testID="edit-project-name"
            >
              <Text style={styles.projectName}>{crewProjectName}</Text>
              <Ionicons name="pencil" size={14} color={C.textTertiary} />
            </Pressable>
          )}
        </View>

        <View style={styles.budgetCard}>
          <View style={styles.budgetRow}>
            <View style={styles.budgetItem}>
              <Ionicons name="people" size={18} color={C.primary} />
              <Text style={styles.budgetValue}>{crewMembers.length}</Text>
              <Text style={styles.budgetLabel}>Crew</Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <Ionicons name="layers" size={18} color={C.primary} />
              <Text style={styles.budgetValue}>{Object.keys(roleGroups).length}</Text>
              <Text style={styles.budgetLabel}>Roles</Text>
            </View>
            <View style={styles.budgetDivider} />
            <View style={styles.budgetItem}>
              <Ionicons name="cash" size={18} color={C.primary} />
              <Text style={styles.budgetValue}>{formatBudget(totalBudget)}</Text>
              <Text style={styles.budgetLabel}>Day Total</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>CREW STRUCTURE</Text>
        {Object.entries(roleGroups).map(([role, members]) => (
          <View key={role} style={styles.roleGroup}>
            <View style={styles.roleHeader}>
              <Text style={styles.roleName}>{role}</Text>
              <Text style={styles.roleRate}>
                {formatBudget(members.reduce((s, m) => s + (m.profile?.dayRate || 0), 0))}/day
              </Text>
            </View>
            {members.map(m => (
              <View key={m.profileId} style={styles.memberRow}>
                <Avatar name={m.profile!.name} size={36} showVerified={m.profile!.isVerified} />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m.profile!.name}</Text>
                  <Text style={styles.memberExp}>{m.profile!.experience} exp</Text>
                </View>
                <View style={styles.memberRight}>
                  <View style={styles.miniRating}>
                    <Ionicons name="star" size={10} color={C.primary} />
                    <Text style={styles.miniRatingText}>{m.profile!.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.memberRate}>
                    {m.profile!.dayRate > 0 ? `${formatBudget(m.profile!.dayRate)}/day` : 'N/A'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.messageSection}>
          <Text style={styles.sectionLabel}>INVITE MESSAGE</Text>
          <TextInput
            style={styles.messageInput}
            multiline
            placeholder={`Hi! We are assembling the crew for "${crewProjectName}" and would love to have you on board. Please review the details and let us know your availability.`}
            placeholderTextColor={C.textTertiary}
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={[
        styles.bottomBar,
        { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8 },
      ]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.editBtn}
        >
          <Ionicons name="pencil" size={16} color={C.textSecondary} />
          <Text style={styles.editBtnText}>Edit Crew</Text>
        </Pressable>
        <Pressable
          onPress={handleSendInvites}
          style={styles.inviteBtn}
          testID="send-invites-btn"
        >
          <Ionicons name="send" size={16} color={C.background} />
          <Text style={styles.inviteBtnText}>Send Invites ({crewMembers.length})</Text>
        </Pressable>
      </View>
    </View>
  );
}
