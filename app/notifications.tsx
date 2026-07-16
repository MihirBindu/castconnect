import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { EmptyState } from '@/components/EmptyState';
import { OfflineBanner } from '@/components/OfflineBanner';
import { AppNotification } from '@/lib/types';

function iconFor(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'message': return 'chatbubble-ellipses';
    case 'application_status': return 'document-text';
    case 'follow': return 'person-add';
    default: return 'notifications';
  }
}

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

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { notifications, markNotificationsRead } = useAppState();
  const topPadding = insets.top + (Platform.OS === 'web' ? 24 : 12);

  // Opening the center marks everything read (optimistic + server).
  useEffect(() => {
    void markNotificationsRead();
  }, [markNotificationsRead]);

  const handlePress = (n: AppNotification) => {
    if (n.type === 'message' && n.actorId) {
      router.push({ pathname: '/chat/[id]', params: { id: n.actorId } });
    } else if (n.type === 'application_status' && n.entityId) {
      router.push({ pathname: '/casting/[id]', params: { id: n.entityId } });
    } else if (n.type === 'follow' && n.actorId) {
      router.push({ pathname: '/profile/[id]', params: { id: n.actorId } });
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <OfflineBanner />

      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 34 : 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePress(item)}
            style={({ pressed }) => [styles.row, !item.read && styles.rowUnread, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
          >
            <View style={styles.iconWrap}>
              <Ionicons name={iconFor(item.type)} size={18} color={C.primary} />
            </View>
            <View style={styles.body}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {!!item.body && <Text style={styles.rowBody} numberOfLines={2}>{item.body}</Text>}
              <Text style={styles.rowTime}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title="No notifications yet" message="Updates about your messages and applications will show up here." />
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    rowUnread: { backgroundColor: 'rgba(212, 168, 83, 0.06)' },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(212, 168, 83, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 15, fontFamily: 'DMSans_600SemiBold', color: C.text },
    rowBody: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: C.textSecondary, lineHeight: 18 },
    rowTime: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: C.textTertiary, marginTop: 2 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  });
}
