import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Skeleton } from '@/components/Skeleton';
import { CastingCallCard } from '@/components/CastingCallCard';
import { TalentCard } from '@/components/TalentCard';
import { ApplicationStatusBadge } from '@/components/StatusBadge';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    headerSection: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 20,
    },
    greeting: {
      fontSize: 14,
      color: C.textSecondary,
      fontFamily: 'DMSans_400Regular',
    },
    userName: {
      fontSize: 26,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
      marginTop: 2,
    },
    notifBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsCard: {
      marginHorizontal: 20,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(212, 168, 83, 0.2)',
      marginBottom: 8,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 24,
      color: C.primary,
      fontFamily: 'DMSans_700Bold',
    },
    statLabel: {
      fontSize: 12,
      color: C.textSecondary,
      fontFamily: 'DMSans_400Regular',
      marginTop: 4,
    },
    statDivider: {
      width: 1,
      height: 32,
      backgroundColor: C.border,
    },
    section: {
      marginTop: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
      marginBottom: 14,
    },
    seeAll: {
      fontSize: 14,
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
    callsList: {
      paddingHorizontal: 20,
      gap: 14,
    },
    appItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: C.surface,
      marginHorizontal: 20,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    appInfo: {
      flex: 1,
      marginRight: 12,
    },
    appTitle: {
      fontSize: 14,
      color: C.text,
      fontFamily: 'DMSans_600SemiBold',
    },
    appDate: {
      fontSize: 12,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
      marginTop: 2,
    },
  });
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { myProfile, profiles, castingCalls, applications, isLoading, retryLoad } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const featuredCalls = castingCalls.filter(c => c.status === 'open').slice(0, 3);
  const featuredTalent = profiles.filter(p => p.role === 'talent' && p.isVerified).slice(0, 5);
  const recentApps = applications.slice(0, 3);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <OfflineBanner />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={retryLoad} tintColor={C.primary} colors={[C.primary]} />
        }
      >
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{myProfile.name}</Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <View style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color={C.text} />
            </View>
          </Pressable>
        </View>

        <LinearGradient
          colors={['rgba(212, 168, 83, 0.15)', 'rgba(212, 168, 83, 0.03)']}
          style={styles.statsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{castingCalls.filter(c => c.status === 'open').length}</Text>
              <Text style={styles.statLabel}>Open Calls</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{applications.length}</Text>
              <Text style={styles.statLabel}>Applications</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{myProfile.connections.length}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
          </View>
        </LinearGradient>

        {recentApps.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Applications</Text>
              <Pressable onPress={() => router.push('/(tabs)/jobs' as any)}>
                <Text style={styles.seeAll}>See All</Text>
              </Pressable>
            </View>
            {recentApps.map(app => (
              <Pressable
                key={app.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/casting/[id]', params: { id: app.castingCallId } });
                }}
                style={({ pressed }) => [styles.appItem, pressed && { opacity: 0.75 }]}
              >
                <View style={styles.appInfo}>
                  <Text style={styles.appTitle} numberOfLines={1}>{app.castingCallTitle}</Text>
                  <Text style={styles.appDate}>
                    Applied {new Date(app.appliedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <ApplicationStatusBadge status={app.status} />
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Talent</Text>
            <Pressable onPress={() => router.push('/(tabs)/discover' as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          <FlatList
            data={featuredTalent}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            scrollEnabled={!!featuredTalent.length}
            renderItem={({ item }) => <TalentCard profile={item} compact />}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              isLoading ? (
                <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 20 }}>
                  {[0, 1, 2].map(i => <Skeleton key={i} width={130} height={150} radius={14} />)}
                </View>
              ) : (
                <Text style={[styles.appDate, { paddingHorizontal: 20 }]}>No featured talent yet</Text>
              )
            }
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Casting Calls</Text>
            <Pressable onPress={() => router.push('/(tabs)/jobs' as any)}>
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          <View style={styles.callsList}>
            {featuredCalls.map(call => (
              <CastingCallCard key={call.id} item={call} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
