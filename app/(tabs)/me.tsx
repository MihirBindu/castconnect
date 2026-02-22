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
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { AvailabilityBadge } from '@/components/StatusBadge';
import { SkillTag } from '@/components/SkillTag';
import { ROLE_LABELS, INDUSTRY_LABELS } from '@/lib/mock-data';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { myProfile, applications, conversations } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/profile/edit' as any);
            }}
          >
            <Feather name="edit-2" size={20} color={Colors.primary} />
          </Pressable>
        </View>

        <LinearGradient
          colors={['rgba(212, 168, 83, 0.12)', 'transparent']}
          style={styles.profileHeader}
        >
          <Avatar name={myProfile.name} size={80} showVerified={myProfile.isVerified} />
          <Text style={styles.profileName}>{myProfile.name}</Text>
          <Text style={styles.profileTitle}>{myProfile.title}</Text>
          <View style={styles.profileMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.metaText}>{myProfile.location}</Text>
            </View>
            <AvailabilityBadge status={myProfile.availability} />
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[myProfile.role]}</Text>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <Text style={styles.bioText}>{myProfile.bio}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Skills</Text>
          <View style={styles.skillsWrap}>
            {myProfile.skills.map(skill => (
              <SkillTag key={skill} label={skill} variant="primary" size="medium" />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Industry</Text>
          <View style={styles.skillsWrap}>
            {myProfile.industryTypes.map(type => (
              <SkillTag key={type} label={INDUSTRY_LABELS[type]} size="medium" />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Experience</Text>
          <Text style={styles.infoText}>{myProfile.experience}</Text>
        </View>

        {myProfile.portfolioLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Portfolio</Text>
            {myProfile.portfolioLinks.map((link, i) => (
              <Pressable
                key={i}
                onPress={() => openLink(link)}
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
            <Text style={styles.contactText}>{myProfile.contactEmail}</Text>
          </View>
          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.contactText}>{myProfile.contactPhone}</Text>
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{myProfile.connections.length}</Text>
            <Text style={styles.statLbl}>Connections</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{applications.length}</Text>
            <Text style={styles.statLbl}>Applications</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{conversations.length}</Text>
            <Text style={styles.statLbl}>Chats</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
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
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
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
  statsSection: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 28,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNum: {
    fontSize: 22,
    color: Colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
  statLbl: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
    marginTop: 4,
  },
});
