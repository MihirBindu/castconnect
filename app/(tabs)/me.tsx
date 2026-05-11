import React, { useMemo } from 'react';
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
import { useColors, useTheme, ThemeMode } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { AvailabilityBadge } from '@/components/StatusBadge';
import { SkillTag } from '@/components/SkillTag';
import { ROLE_LABELS, INDUSTRY_LABELS } from '@/lib/mock-data';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const THEME_OPTIONS: { mode: ThemeMode; icon: string; label: string; description: string }[] = [
  { mode: 'dark',  icon: 'moon',        label: 'Dark',  description: 'Deep black' },
  { mode: 'mid',   icon: 'partly-sunny', label: 'Mid',   description: 'Midnight blue' },
  { mode: 'light', icon: 'sunny',        label: 'Light', description: 'Clean white' },
];

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
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
      color: C.text,
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
    section: {
      paddingHorizontal: 20,
      marginTop: 24,
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
    statsSection: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 28,
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    statNum: {
      fontSize: 22,
      color: C.primary,
      fontFamily: 'DMSans_700Bold',
    },
    statLbl: {
      fontSize: 12,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
      marginTop: 4,
    },
    appearanceSection: {
      paddingHorizontal: 20,
      marginTop: 28,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    themeCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.border,
      backgroundColor: C.surface,
      gap: 6,
    },
    themeCardActive: {
      borderColor: C.primary,
      backgroundColor: 'rgba(212, 168, 83, 0.08)',
    },
    themeIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.surfaceLight,
    },
    themeIconWrapActive: {
      backgroundColor: 'rgba(212, 168, 83, 0.18)',
    },
    themeLabel: {
      fontSize: 13,
      color: C.textSecondary,
      fontFamily: 'DMSans_600SemiBold',
    },
    themeLabelActive: {
      color: C.primary,
    },
    themeDesc: {
      fontSize: 10,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    themeDescActive: {
      color: C.primary,
      opacity: 0.7,
    },
    themeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: C.border,
    },
    themeDotActive: {
      backgroundColor: C.primary,
    },
    dayRateText: {
      fontSize: 14,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
      marginTop: 2,
    },
  });
}

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { mode, setMode } = useTheme();
  const { myProfile, applications, conversations } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const formatPortfolioUrl = (url: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      return parts.length > 0 ? `${u.hostname}/${parts[0]}` : u.hostname;
    } catch {
      return url;
    }
  };

  const handleThemeChange = (newMode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
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
            <Feather name="edit-2" size={20} color={C.primary} />
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
              <Ionicons name="location-outline" size={14} color={C.textSecondary} />
              <Text style={styles.metaText}>{myProfile.location}</Text>
            </View>
            <AvailabilityBadge status={myProfile.availability} />
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[myProfile.role]}</Text>
          </View>
          {myProfile.dayRate > 0 && (
            <Text style={styles.dayRateText}>
              ₹{myProfile.dayRate >= 100000 ? `${(myProfile.dayRate / 100000).toFixed(1)}L` : `${(myProfile.dayRate / 1000).toFixed(0)}K`}/day
            </Text>
          )}
        </LinearGradient>

        <View style={styles.appearanceSection}>
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map(opt => {
              const isActive = mode === opt.mode;
              return (
                <Pressable
                  key={opt.mode}
                  onPress={() => handleThemeChange(opt.mode)}
                  style={[styles.themeCard, isActive && styles.themeCardActive]}
                >
                  <View style={[styles.themeIconWrap, isActive && styles.themeIconWrapActive]}>
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={isActive ? C.primary : C.textSecondary}
                    />
                  </View>
                  <Text style={[styles.themeLabel, isActive && styles.themeLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.themeDesc, isActive && styles.themeDescActive]}>
                    {opt.description}
                  </Text>
                  <View style={[styles.themeDot, isActive && styles.themeDotActive]} />
                </Pressable>
              );
            })}
          </View>
        </View>

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
                style={({ pressed }) => [styles.linkItem, pressed && { opacity: 0.75 }]}
              >
                <MaterialCommunityIcons name="link-variant" size={18} color={C.primary} />
                <Text style={styles.linkText} numberOfLines={1}>{formatPortfolioUrl(link)}</Text>
                <Ionicons name="open-outline" size={14} color={C.textTertiary} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contact</Text>
          <Pressable
            style={({ pressed }) => [styles.contactItem, pressed && { opacity: 0.75 }]}
            onPress={() => Linking.openURL(`mailto:${myProfile.contactEmail}`)}
          >
            <Ionicons name="mail-outline" size={18} color={C.textSecondary} />
            <Text style={styles.contactText}>{myProfile.contactEmail}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.contactItem, pressed && { opacity: 0.75 }]}
            onPress={() => Linking.openURL(`tel:${myProfile.contactPhone}`)}
          >
            <Ionicons name="call-outline" size={18} color={C.textSecondary} />
            <Text style={styles.contactText}>{myProfile.contactPhone}</Text>
          </Pressable>
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
