import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const ROLE_LABEL: Record<string, string> = {
  talent: 'Talent',
  producer: 'Producer',
  casting_director: 'Casting Director',
};

export default function ProfileViewersScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { profileViewers } = useAppState();
  const topPadding = insets.top + (Platform.OS === 'web' ? 24 : 12);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Profile Views</Text>
        <View style={{ width: 40 }} />
      </View>

      <OfflineBanner />

      <FlatList
        data={profileViewers}
        keyExtractor={v => v.viewerId}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : 24 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          profileViewers.length > 0 ? (
            <Text style={styles.count}>{profileViewers.length} {profileViewers.length === 1 ? 'person' : 'people'} viewed your profile</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/profile/[id]', params: { id: item.viewerId } })}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <Avatar name={item.name} size={44} image={item.profileImage} showVerified={item.isVerified} />
            <View style={styles.body}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{item.title || ROLE_LABEL[item.role] || ''}</Text>
            </View>
            <Text style={styles.time}>{timeAgo(item.viewedAt)}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState icon="eye-outline" title="No views yet" message="When people view your profile, they'll appear here." />
        }
      />
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingBottom: 8 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: C.text },
    count: { fontSize: 13, color: C.textSecondary, fontFamily: 'DMSans_500Medium', paddingHorizontal: 20, paddingVertical: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    body: { flex: 1, gap: 2 },
    name: { fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: C.text },
    sub: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: C.textSecondary },
    time: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: C.textTertiary },
  });
}
