import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { AvailabilityBadge } from '@/components/StatusBadge';
import { SkillTag } from '@/components/SkillTag';
import { ROLE_LABELS, INDUSTRY_LABELS } from '@/lib/mock-data';
import * as Haptics from 'expo-haptics';

export default function ProfileDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { profiles, myProfile, toggleConnection } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const profile = profiles.find(p => p.id === id);
  const isConnected = myProfile.connections.includes(id || '');

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
    toggleConnection(profile.id);
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Profile</Text>
        <View style={{ width: 40 }} />
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
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{profile.location}</Text>
            </View>
            <AvailabilityBadge status={profile.availability} />
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[profile.role]}</Text>
          </View>
        </LinearGradient>

        <View style={styles.actions}>
          <Pressable
            onPress={handleConnect}
            style={({ pressed }) => [
              styles.connectBtn,
              isConnected && styles.connectedBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons
              name={isConnected ? 'checkmark' : 'person-add-outline'}
              size={18}
              color={isConnected ? Colors.accentGreen : Colors.black}
            />
            <Text style={[styles.connectBtnText, isConnected && styles.connectedBtnText]}>
              {isConnected ? 'Connected' : 'Connect'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={({ pressed }) => [styles.messageBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="chatbubble-outline" size={18} color={Colors.primary} />
            <Text style={styles.messageBtnText}>Message</Text>
          </Pressable>
        </View>

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
                  <MaterialCommunityIcons name="link-variant" size={18} color={Colors.primary} />
                  <Text style={styles.linkText} numberOfLines={1}>{link}</Text>
                  <Ionicons name="open-outline" size={14} color={Colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Contact</Text>
            <View style={styles.contactItem}>
              <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.contactText}>{profile.contactEmail}</Text>
            </View>
            <View style={styles.contactItem}>
              <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.contactText}>{profile.contactPhone}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
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
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
    marginTop: 8,
  },
  profileTitle: {
    fontSize: 16,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
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
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
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
    backgroundColor: Colors.primary,
  },
  connectedBtn: {
    backgroundColor: 'rgba(52, 199, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  connectBtnText: {
    fontSize: 15,
    color: Colors.black,
    fontFamily: 'DMSans_600SemiBold',
  },
  connectedBtnText: {
    color: Colors.accentGreen,
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
    borderColor: Colors.primary,
  },
  messageBtnText: {
    fontSize: 15,
    color: Colors.primary,
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
    color: Colors.textTertiary,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  bioText: {
    fontSize: 15,
    color: Colors.textSecondary,
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
    color: Colors.text,
    fontFamily: 'DMSans_500Medium',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  linkText: {
    fontSize: 14,
    color: Colors.accentBlue,
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
    color: Colors.text,
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
    color: Colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
  },
  backLink: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
});
