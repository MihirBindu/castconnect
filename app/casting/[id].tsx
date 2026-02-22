import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { SkillTag } from '@/components/SkillTag';
import { INDUSTRY_LABELS } from '@/lib/mock-data';
import * as Haptics from 'expo-haptics';

export default function CastingCallDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { castingCalls, applications, addApplication } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const call = castingCalls.find(c => c.id === id);
  const hasApplied = applications.some(a => a.castingCallId === id);
  const application = applications.find(a => a.castingCallId === id);

  if (!call) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Casting call not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleApply = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addApplication(call.id, call.title);
    Alert.alert('Applied!', 'Your application has been submitted successfully.');
  };

  const deadlineDate = new Date(call.deadline);
  const isExpired = deadlineDate < new Date();

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>Casting Call</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.content}>
          <View style={styles.badges}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{INDUSTRY_LABELS[call.projectType]}</Text>
            </View>
            {call.status === 'open' && !isExpired && (
              <View style={styles.openBadge}>
                <View style={styles.openDot} />
                <Text style={styles.openText}>Open</Text>
              </View>
            )}
            {isExpired && (
              <View style={styles.closedBadge}>
                <Text style={styles.closedText}>Deadline Passed</Text>
              </View>
            )}
          </View>

          <Text style={styles.title}>{call.title}</Text>

          <View style={styles.projectRow}>
            <MaterialCommunityIcons name="movie-open-outline" size={18} color={Colors.primary} />
            <Text style={styles.projectName}>{call.projectName}</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="briefcase-outline" size={18} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{call.roleNeeded}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={18} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{call.location}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={18} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Compensation</Text>
                <Text style={styles.infoValue}>{call.compensation}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
              <View>
                <Text style={styles.infoLabel}>Experience</Text>
                <Text style={styles.infoValue}>{call.experienceLevel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descText}>{call.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Required Skills</Text>
            <View style={styles.skillsWrap}>
              {call.skillsRequired.map(skill => (
                <SkillTag key={skill} label={skill} variant="primary" size="medium" />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Deadline</Text>
            <Text style={styles.deadlineText}>
              {deadlineDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.postedBySection}>
            <View style={styles.postedByRow}>
              {call.postedByVerified && (
                <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
              )}
              <Text style={styles.postedByName}>{call.postedByName}</Text>
            </View>
            <View style={styles.applicantRow}>
              <MaterialCommunityIcons name="account-group-outline" size={18} color={Colors.textTertiary} />
              <Text style={styles.applicantCount}>{call.applicantCount} applicants</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 16) }]}>
        {hasApplied ? (
          <View style={styles.appliedBar}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.accentGreen} />
            <Text style={styles.appliedText}>
              {application?.status === 'shortlisted' ? 'Shortlisted' :
               application?.status === 'selected' ? 'Selected' :
               application?.status === 'rejected' ? 'Not Selected' : 'Applied'}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleApply}
            disabled={isExpired}
            style={({ pressed }) => [
              styles.applyBtn,
              pressed && { opacity: 0.85 },
              isExpired && styles.applyBtnDisabled,
            ]}
          >
            <Text style={styles.applyBtnText}>
              {isExpired ? 'Deadline Passed' : 'Apply Now'}
            </Text>
          </Pressable>
        )}
      </View>
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
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  badges: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 168, 83, 0.12)',
  },
  typeText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accentGreen,
  },
  openText: {
    fontSize: 12,
    color: Colors.accentGreen,
    fontFamily: 'DMSans_500Medium',
  },
  closedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  closedText: {
    fontSize: 12,
    color: Colors.accentRed,
    fontFamily: 'DMSans_500Medium',
  },
  title: {
    fontSize: 24,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
    lineHeight: 30,
    marginBottom: 12,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  projectName: {
    fontSize: 16,
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
  infoGrid: {
    gap: 16,
    marginBottom: 24,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  infoValue: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'DMSans_500Medium',
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
  descText: {
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
  deadlineText: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'DMSans_500Medium',
  },
  postedBySection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  postedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postedByName: {
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'DMSans_600SemiBold',
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicantCount: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyBtnDisabled: {
    backgroundColor: Colors.surfaceElevated,
  },
  applyBtnText: {
    fontSize: 16,
    color: Colors.black,
    fontFamily: 'DMSans_700Bold',
  },
  appliedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  appliedText: {
    fontSize: 16,
    color: Colors.accentGreen,
    fontFamily: 'DMSans_700Bold',
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
