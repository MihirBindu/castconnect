import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { UserProfile } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/mock-data';
import { Avatar } from './Avatar';
import { AvailabilityBadge } from './StatusBadge';
import { SkillTag } from './SkillTag';
import * as Haptics from 'expo-haptics';

interface TalentCardProps {
  profile: UserProfile;
  compact?: boolean;
}

export function TalentCard({ profile, compact }: TalentCardProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/profile/[id]', params: { id: profile.id } });
  };

  if (compact) {
    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.compactCard, pressed && styles.cardPressed]}
      >
        <Avatar name={profile.name} size={56} showVerified={profile.isVerified} />
        <Text style={styles.compactName} numberOfLines={1}>{profile.name}</Text>
        <Text style={styles.compactTitle} numberOfLines={1}>{profile.title}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.top}>
        <Avatar name={profile.name} size={50} showVerified={profile.isVerified} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{profile.name}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{profile.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={Colors.textTertiary} />
            <Text style={styles.location}>{profile.location}</Text>
          </View>
        </View>
        <AvailabilityBadge status={profile.availability} />
      </View>

      <View style={styles.skills}>
        {profile.skills.slice(0, 4).map(skill => (
          <SkillTag key={skill} label={skill} />
        ))}
        {profile.skills.length > 4 && (
          <SkillTag label={`+${profile.skills.length - 4}`} />
        )}
      </View>

      <View style={styles.bottom}>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{ROLE_LABELS[profile.role]}</Text>
        </View>
        <Text style={styles.exp}>{profile.experience} exp</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
  },
  title: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  location: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(212, 168, 83, 0.12)',
  },
  roleText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
  exp: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  compactCard: {
    alignItems: 'center',
    width: 100,
    gap: 6,
  },
  compactName: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: 'DMSans_600SemiBold',
    textAlign: 'center',
  },
  compactTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
  },
});
