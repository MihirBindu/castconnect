import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { Conversation } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/mock-data';
import { Avatar } from './Avatar';
import * as Haptics from 'expo-haptics';

interface ConversationItemProps {
  item: Conversation;
  onPress: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    pressed: {
      backgroundColor: C.surfaceLight,
    },
    content: {
      flex: 1,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 3,
    },
    name: {
      fontSize: 16,
      color: C.text,
      fontFamily: 'DMSans_600SemiBold',
      flex: 1,
      marginRight: 8,
    },
    time: {
      fontSize: 12,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    timeUnread: {
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    message: {
      fontSize: 14,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
      flex: 1,
    },
    messageUnread: {
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      fontSize: 11,
      color: C.black,
      fontFamily: 'DMSans_700Bold',
    },
    role: {
      fontSize: 11,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
  });
}

export function ConversationItem({ item, onPress }: ConversationItemProps) {
  const C = useColors();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <Avatar
        name={item.participantName}
        size={52}
        showVerified={item.participantVerified}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{item.participantName}</Text>
          <Text style={[styles.time, item.unreadCount > 0 && styles.timeUnread]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={[styles.message, item.unreadCount > 0 && styles.messageUnread]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.role}>{ROLE_LABELS[item.participantRole]}</Text>
      </View>
    </Pressable>
  );
}
