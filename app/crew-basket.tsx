import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  SectionList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { CrewRole, UserProfile } from '@/lib/types';
import * as Haptics from 'expo-haptics';

export default function CrewBasketScreen() {
  const insets = useSafeAreaInsets();
  const {
    crewBasket,
    profiles,
    removeFromCrewBasket,
    clearCrewBasket,
    crewProjectName,
  } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const profileMap = useMemo(() => {
    const map: Record<string, UserProfile> = {};
    for (const p of profiles) map[p.id] = p;
    return map;
  }, [profiles]);

  const sections = useMemo(() => {
    const grouped: Record<string, { profileId: string; profile: UserProfile }[]> = {};
    for (const item of crewBasket) {
      const profile = profileMap[item.profileId];
      if (!profile) continue;
      const role = item.assignedRole;
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push({ profileId: item.profileId, profile });
    }
    return Object.entries(grouped).map(([role, data]) => ({
      title: role,
      data,
    }));
  }, [crewBasket, profileMap]);

  const totalBudget = useMemo(() => {
    let total = 0;
    for (const item of crewBasket) {
      const profile = profileMap[item.profileId];
      if (profile) total += profile.dayRate;
    }
    return total;
  }, [crewBasket, profileMap]);

  const formatBudget = (amount: number) => {
    if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return `${amount}`;
  };

  const handleRemove = (profileId: string, name: string) => {
    Alert.alert(
      'Remove from Crew',
      `Remove ${name} from your crew basket?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            removeFromCrewBasket(profileId);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Crew Basket',
      'Remove all members from your crew basket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearCrewBasket();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Crew Basket</Text>
          <Text style={styles.headerSub}>{crewProjectName}</Text>
        </View>
        {crewBasket.length > 0 && (
          <Pressable onPress={handleClearAll} style={styles.clearBtn} testID="clear-all-btn">
            <Text style={styles.clearBtnText}>Clear</Text>
          </Pressable>
        )}
      </View>

      {crewBasket.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={56} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Your crew basket is empty</Text>
          <Text style={styles.emptyText}>
            Browse professionals on the Discover tab and add them to your crew
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={styles.browseBtn}
          >
            <Text style={styles.browseBtnText}>Browse Talent</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{crewBasket.length}</Text>
              <Text style={styles.summaryLabel}>Members</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{sections.length}</Text>
              <Text style={styles.summaryLabel}>Roles</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatBudget(totalBudget)}</Text>
              <Text style={styles.summaryLabel}>Est. Day Rate</Text>
            </View>
          </View>

          <SectionList
            sections={sections}
            keyExtractor={item => item.profileId}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
              </View>
            )}
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <Pressable
                  style={styles.memberInfo}
                  onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.profileId } })}
                >
                  <Avatar name={item.profile.name} size={44} showVerified={item.profile.isVerified} />
                  <View style={styles.memberDetails}>
                    <Text style={styles.memberName}>{item.profile.name}</Text>
                    <Text style={styles.memberTitle}>{item.profile.title}</Text>
                    <View style={styles.memberMeta}>
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={10} color={Colors.primary} />
                        <Text style={styles.ratingText}>{item.profile.rating.toFixed(1)}</Text>
                      </View>
                      <Text style={styles.memberRate}>
                        {item.profile.dayRate > 0 ? `${formatBudget(item.profile.dayRate)}/day` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                <Pressable
                  onPress={() => handleRemove(item.profileId, item.profile.name)}
                  style={styles.removeBtn}
                  testID={`remove-${item.profileId}`}
                >
                  <Ionicons name="close-circle" size={22} color={Colors.accentRed} />
                </Pressable>
              </View>
            )}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: Platform.OS === 'web' ? 34 + 100 : 140 },
            ]}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />

          <View style={[
            styles.bottomBar,
            { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 8 },
          ]}>
            <View style={styles.bottomInfo}>
              <Text style={styles.bottomTotal}>Total: {formatBudget(totalBudget)}/day</Text>
              <Text style={styles.bottomMembers}>{crewBasket.length} members selected</Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/crew-review');
              }}
              style={styles.reviewBtn}
              testID="review-team-btn"
            >
              <Text style={styles.reviewBtnText}>Review Team</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.background} />
            </Pressable>
          </View>
        </>
      )}
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  clearBtnText: {
    fontSize: 13,
    color: Colors.accentRed,
    fontFamily: 'DMSans_600SemiBold',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  browseBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  browseBtnText: {
    fontSize: 14,
    color: Colors.background,
    fontFamily: 'DMSans_700Bold',
  },
  summary: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
    color: Colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    color: Colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'DMSans_600SemiBold',
  },
  memberTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    marginTop: 1,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
  memberRate: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  removeBtn: {
    padding: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  bottomInfo: {},
  bottomTotal: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
  },
  bottomMembers: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  reviewBtnText: {
    fontSize: 14,
    color: Colors.background,
    fontFamily: 'DMSans_700Bold',
  },
});
