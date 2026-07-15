import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { CastingCall } from '@/lib/types';
import { INDUSTRY_LABELS } from '@/lib/mock-data';
import { SkillTag } from './SkillTag';
import * as Haptics from 'expo-haptics';

interface CastingCallCardProps {
  item: CastingCall;
  compact?: boolean;
  applied?: boolean;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    cardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: 'rgba(212, 168, 83, 0.12)',
    },
    typeText: {
      fontSize: 11,
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    openBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    appliedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: 'rgba(52, 199, 89, 0.12)',
    },
    appliedBadgeText: {
      fontSize: 11,
      color: '#34C759',
      fontFamily: 'DMSans_600SemiBold',
    },
    openDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#34C759',
    },
    openText: {
      fontSize: 11,
      color: '#34C759',
      fontFamily: 'DMSans_500Medium',
    },
    timeAgo: {
      fontSize: 12,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    title: {
      fontSize: 17,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
      lineHeight: 22,
      marginBottom: 6,
    },
    description: {
      fontSize: 14,
      color: C.textSecondary,
      fontFamily: 'DMSans_400Regular',
      lineHeight: 20,
      marginBottom: 12,
    },
    meta: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 12,
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
    skills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 12,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: C.border,
    },
    postedBy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    postedByText: {
      fontSize: 13,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    applicants: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    applicantText: {
      fontSize: 13,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
  });
}

export function CastingCallCard({ item, compact, applied }: CastingCallCardProps) {
  const C = useColors();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/casting/[id]', params: { id: item.id } });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{INDUSTRY_LABELS[item.projectType] || item.projectType}</Text>
          </View>
          {item.status === 'open' && (
            <View style={styles.openBadge}>
              <View style={styles.openDot} />
              <Text style={styles.openText}>Open</Text>
            </View>
          )}
          {applied && (
            <View style={styles.appliedBadge}>
              <Ionicons name="checkmark-circle" size={12} color="#34C759" />
              <Text style={styles.appliedBadgeText}>Applied</Text>
            </View>
          )}
        </View>
        <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

      {!compact && (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      )}

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="briefcase-outline" size={14} color={C.textSecondary} />
          <Text style={styles.metaText}>{item.roleNeeded}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={14} color={C.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
        </View>
      </View>

      {!compact && (
        <View style={styles.skills}>
          {item.skillsRequired.slice(0, 3).map(skill => (
            <SkillTag key={skill} label={skill} variant="primary" />
          ))}
          {item.skillsRequired.length > 3 && (
            <SkillTag label={`+${item.skillsRequired.length - 3}`} />
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.postedBy}>
          {item.postedByVerified && (
            <Ionicons name="checkmark-circle" size={14} color={C.primary} />
          )}
          <Text style={styles.postedByText}>{item.postedByName}</Text>
        </View>
        <View style={styles.applicants}>
          <MaterialCommunityIcons name="account-group-outline" size={16} color={C.textTertiary} />
          <Text style={styles.applicantText}>{item.applicantCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}
