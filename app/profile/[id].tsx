import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { AvailabilityBadge } from '@/components/StatusBadge';
import { SkillTag } from '@/components/SkillTag';
import { ROLE_LABELS, INDUSTRY_LABELS } from '@/lib/mock-data';
import * as Haptics from 'expo-haptics';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: {
      fontSize: 16,
      color: C.textSecondary,
      fontFamily: 'DMSans_600SemiBold',
      flex: 1,
      textAlign: 'center',
    },
    profileHeader: {
      alignItems: 'center',
      paddingVertical: 24,
      marginHorizontal: 20,
      borderRadius: 20,
      gap: 8,
    },
    profileName: {
      fontSize: 24,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
      marginTop: 8,
    },
    profileTitle: {
      fontSize: 16,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    profileMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginTop: 4,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 13,
      color: C.textSecondary,
      fontFamily: 'DMSans_400Regular',
    },
    roleBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(212, 168, 83, 0.15)',
      marginTop: 4,
    },
    roleText: {
      fontSize: 13,
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      gap: 0,
    },
    statItem: {
      alignItems: 'center',
      paddingHorizontal: 16,
      gap: 2,
    },
    statIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statValue: {
      fontSize: 16,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
    },
    statLabel: {
      fontSize: 11,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    statDivider: {
      width: 1,
      height: 28,
      backgroundColor: C.border,
    },
    actions: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      marginTop: 16,
      marginBottom: 8,
    },
    connectBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: C.primary,
    },
    connectedBtn: {
      backgroundColor: 'rgba(52, 199, 89, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(52, 199, 89, 0.3)',
    },
    connectBtnText: {
      fontSize: 15,
      color: C.black,
      fontFamily: 'DMSans_600SemiBold',
    },
    connectedBtnText: {
      color: '#34C759',
    },
    messageBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.primary,
    },
    messageBtnText: {
      fontSize: 15,
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionLabel: {
      fontSize: 13,
      color: C.textTertiary,
      fontFamily: 'DMSans_600SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    bioText: {
      fontSize: 15,
      color: C.textSecondary,
      fontFamily: 'DMSans_400Regular',
      lineHeight: 22,
    },
    skillsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    infoText: {
      fontSize: 15,
      color: C.text,
      fontFamily: 'DMSans_500Medium',
    },
    linkItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: C.surface,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    linkText: {
      fontSize: 14,
      color: C.accentBlue,
      fontFamily: 'DMSans_400Regular',
      flex: 1,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10,
    },
    contactText: {
      fontSize: 15,
      color: C.text,
      fontFamily: 'DMSans_400Regular',
    },
    notFound: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    notFoundText: {
      fontSize: 16,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    backLink: {
      fontSize: 14,
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
  });
}

export default function ProfileDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { profiles, myProfile, conversations, toggleConnection, isBlocked, blockUser, unblockUser, reportUser, recordProfileView } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  // Own profile is filtered out of `profiles`; resolve it from myProfile so
  // "preview as public" works.
  const profile = id === myProfile.id ? myProfile : profiles.find(p => p.id === id);
  const isConnected = myProfile.connections.includes(id || '');

  // Record a view when opening someone else's profile.
  useEffect(() => {
    if (id && id !== myProfile.id) void recordProfileView(id);
  }, [id, myProfile.id, recordProfileView]);

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Profile not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleConnect = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void toggleConnection(profile.id);
  };

  const isOwn = profile.id === myProfile.id;
  const blocked = isBlocked(profile.id);

  const submitReport = async (reason: string) => {
    const ok = await reportUser(profile.id, reason);
    Alert.alert(
      ok ? 'Report submitted' : 'Could not submit',
      ok ? 'Thanks — our team will review it.' : 'Please try again.',
    );
  };

  const handleReport = () => {
    Alert.alert('Report this profile', 'Why are you reporting it?', [
      { text: 'Spam or scam', onPress: () => submitReport('spam') },
      { text: 'Inappropriate content', onPress: () => submitReport('inappropriate') },
      { text: 'Harassment', onPress: () => submitReport('harassment') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleBlockToggle = () => {
    if (blocked) {
      void unblockUser(profile.id);
      return;
    }
    Alert.alert('Block this user?', 'They won’t be able to message you, and you won’t see each other in messages.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => { void blockUser(profile.id); router.back(); } },
    ]);
  };

  const openMenu = () => {
    Alert.alert(profile.name, undefined, [
      { text: blocked ? 'Unblock' : 'Block', style: blocked ? 'default' : 'destructive', onPress: handleBlockToggle },
      { text: 'Report', onPress: handleReport },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Profile</Text>
        {isOwn ? (
          <View style={{ width: 40 }} />
        ) : (
          <Pressable onPress={openMenu} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="More options">
            <Ionicons name="ellipsis-horizontal" size={22} color={C.text} />
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <LinearGradient
          colors={['rgba(212, 168, 83, 0.1)', 'transparent']}
          style={styles.profileHeader}
        >
          <Avatar name={profile.name} size={80} showVerified={profile.isVerified} />
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileTitle}>{profile.title}</Text>
          <View style={styles.profileMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={C.textSecondary} />
              <Text style={styles.metaText}>{profile.location}</Text>
            </View>
            <AvailabilityBadge status={profile.availability} />
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{profile.crewRole}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconRow}>
                <Ionicons name="star" size={14} color={C.primary} />
                <Text style={styles.statValue}>{profile.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.statLabel}>{profile.reviewCount} reviews</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.experience}</Text>
              <Text style={styles.statLabel}>Experience</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile.dayRate > 0 ? `₹${(profile.dayRate / 1000).toFixed(0)}K` : 'N/A'}</Text>
              <Text style={styles.statLabel}>Day Rate</Text>
            </View>
          </View>
        </LinearGradient>

        {!isOwn && (blocked ? (
          <View style={styles.actions}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void unblockUser(profile.id); }}
              style={({ pressed }) => [styles.connectBtn, pressed && { opacity: 0.75 }]}
            >
              <Ionicons name="ban-outline" size={18} color={C.black} />
              <Text style={styles.connectBtnText}>Unblock</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.actions}>
            <Pressable
              onPress={handleConnect}
              style={({ pressed }) => [
                styles.connectBtn,
                isConnected && styles.connectedBtn,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons
                name={isConnected ? 'checkmark' : 'person-add-outline'}
                size={18}
                color={isConnected ? '#34C759' : C.black}
              />
              <Text style={[styles.connectBtnText, isConnected && styles.connectedBtnText]}>
                {isConnected ? 'Connected' : 'Connect'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const conv = conversations.find(c => c.participantId === profile.id);
                if (conv) {
                  router.push({ pathname: '/chat/[id]', params: { id: conv.id } });
                }
              }}
              style={({ pressed }) => [styles.messageBtn, pressed && { opacity: 0.75 }]}
            >
              <Ionicons name="chatbubble-outline" size={18} color={C.primary} />
              <Text style={styles.messageBtnText}>Message</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Skills</Text>
            <View style={styles.skillsWrap}>
              {profile.skills.map(skill => (
                <SkillTag key={skill} label={skill} variant="primary" size="medium" />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Industry</Text>
            <View style={styles.skillsWrap}>
              {profile.industryTypes.map(type => (
                <SkillTag key={type} label={INDUSTRY_LABELS[type]} size="medium" />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Experience</Text>
            <Text style={styles.infoText}>{profile.experience}</Text>
          </View>

          {profile.portfolioLinks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Portfolio</Text>
              {profile.portfolioLinks.map((link, i) => (
                <Pressable
                  key={i}
                  onPress={() => Linking.openURL(link)}
                  style={({ pressed }) => [styles.linkItem, pressed && { opacity: 0.7 }]}
                >
                  <MaterialCommunityIcons name="link-variant" size={18} color={C.primary} />
                  <Text style={styles.linkText} numberOfLines={1}>{link}</Text>
                  <Ionicons name="open-outline" size={14} color={C.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Contact</Text>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={18} color={C.textSecondary} />
              <Text style={styles.contactText}>{profile.contactEmail}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={18} color={C.textSecondary} />
              <Text style={styles.contactText}>{profile.contactPhone}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
