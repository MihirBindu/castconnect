import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { ConversationItem } from '@/components/ConversationItem';
import { OfflineBanner } from '@/components/OfflineBanner';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonList } from '@/components/Skeleton';
import { Conversation } from '@/lib/types';

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 28,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
    },
    unreadCount: {
      fontSize: 13,
      color: C.primary,
      fontFamily: 'DMSans_500Medium',
      marginTop: 2,
    },
    separator: {
      height: 1,
      backgroundColor: C.border,
      marginLeft: 86,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      color: C.textSecondary,
      fontFamily: 'DMSans_600SemiBold',
    },
    emptySubtext: {
      fontSize: 14,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
      textAlign: 'center',
      paddingHorizontal: 40,
    },
  });
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { conversations, isLoading, loadError, retryLoad } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <Text style={styles.unreadCount}>{totalUnread} unread</Text>
          )}
        </View>
      </View>

      <OfflineBanner />

      <FlatList
        data={sortedConversations}
        keyExtractor={item => item.id}
        contentContainerStyle={{
          paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={retryLoad} tintColor={C.primary} colors={[C.primary]} />
        }
        renderItem={({ item }: { item: Conversation }) => (
          <ConversationItem
            item={item}
            onPress={() => {
              router.push({ pathname: '/chat/[id]', params: { id: item.id } });
            }}
          />
        )}
        ItemSeparatorComponent={() => (
          <View style={styles.separator} />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList count={6} />
          ) : loadError ? (
            <EmptyState
              tone="error"
              icon="alert-circle-outline"
              title="Couldn't load messages"
              message={loadError}
              actionLabel="Retry"
              onAction={retryLoad}
            />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No messages yet"
              message="Start connecting with industry professionals"
            />
          )
        }
      />
    </View>
  );
}
