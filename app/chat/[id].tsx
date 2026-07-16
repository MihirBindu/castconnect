import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { Message } from '@/lib/types';
import * as Haptics from 'expo-haptics';

function makeBubbleStyles(C: ThemeColors) {
  return StyleSheet.create({
    bubbleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginBottom: 4,
    },
    bubbleRowMe: {
      justifyContent: 'flex-end',
    },
    bubbleCol: {
      maxWidth: '78%',
    },
    bubble: {
      maxWidth: '100%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 4,
      marginTop: 4,
    },
    failedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 3,
      paddingHorizontal: 4,
    },
    failedText: {
      fontSize: 11,
      color: C.accentRed,
      fontFamily: 'DMSans_500Medium',
    },
    bubbleMe: {
      backgroundColor: C.primary,
      borderBottomRightRadius: 6,
    },
    bubbleOther: {
      backgroundColor: C.surfaceLight,
      borderBottomLeftRadius: 6,
    },
    bubbleText: {
      fontSize: 15,
      color: C.text,
      fontFamily: 'DMSans_400Regular',
      lineHeight: 20,
    },
    bubbleTextMe: {
      color: C.black,
    },
    bubbleTime: {
      fontSize: 11,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    bubbleTimeMe: {
      color: 'rgba(0,0,0,0.5)',
    },
  });
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
      gap: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chatHeader: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    chatName: {
      fontSize: 16,
      color: C.text,
      fontFamily: 'DMSans_600SemiBold',
    },
    chatRole: {
      fontSize: 12,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    chatArea: {
      flex: 1,
    },
    messageList: {
      padding: 16,
      gap: 6,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: C.border,
      backgroundColor: C.background,
      gap: 10,
    },
    textInput: {
      flex: 1,
      backgroundColor: C.surfaceLight,
      borderRadius: 22,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: C.text,
      fontFamily: 'DMSans_400Regular',
      maxHeight: 100,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 1,
    },
    sendBtnActive: {
      backgroundColor: C.primary,
    },
    emptyChat: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
      gap: 8,
      transform: [{ scaleY: -1 }],
    },
    emptyChatText: {
      fontSize: 14,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    notFound: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    notFoundText: {
      fontSize: 16,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    backLink: {
      fontSize: 14,
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
  });
}

function MessageBubble({ message, isMe, onResend }: { message: Message; isMe: boolean; onResend?: () => void }) {
  const C = useColors();
  const bStyles = useMemo(() => makeBubbleStyles(C), [C]);
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const failed = message.status === 'failed';
  const sending = message.status === 'sending';

  return (
    <View style={[bStyles.bubbleRow, isMe && bStyles.bubbleRowMe]}>
      <View style={[bStyles.bubbleCol, isMe && { alignItems: 'flex-end' }]}>
        <Pressable
          disabled={!failed}
          onPress={onResend}
          style={[bStyles.bubble, isMe ? bStyles.bubbleMe : bStyles.bubbleOther]}
        >
          <Text style={[bStyles.bubbleText, isMe && bStyles.bubbleTextMe]}>
            {message.content}
          </Text>
          <View style={bStyles.metaRow}>
            <Text style={[bStyles.bubbleTime, isMe && bStyles.bubbleTimeMe]}>{time}</Text>
            {isMe && sending && <Ionicons name="time-outline" size={12} color="rgba(0,0,0,0.5)" />}
            {isMe && message.status === 'sent' && <Ionicons name="checkmark" size={13} color="rgba(0,0,0,0.5)" />}
            {isMe && !message.status && message.read && <Ionicons name="checkmark-done" size={14} color="rgba(0,0,0,0.65)" />}
          </View>
        </Pressable>
        {failed && (
          <Pressable
            onPress={onResend}
            style={bStyles.failedRow}
            accessibilityRole="button"
            accessibilityLabel="Message failed to send, tap to retry"
          >
            <Ionicons name="alert-circle" size={13} color={C.accentRed} />
            <Text style={bStyles.failedText}>Failed — tap to retry</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { conversations, messages, sendMessage, resendMessage, loadConversation, session } = useAppState();
  const [inputText, setInputText] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;
  const myId = session?.user?.id ?? 'me';

  // Load real messages + mark them read when the conversation opens.
  useEffect(() => {
    if (id) void loadConversation(id);
  }, [id, loadConversation]);

  const conversation = conversations.find(c => c.id === id);
  const chatMessages = messages[id || ''] || [];

  const reversedMessages = [...chatMessages].reverse();

  const handleSend = () => {
    if (!inputText.trim() || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void sendMessage(id, inputText.trim());
    setInputText('');
  };

  if (!conversation) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Conversation not found</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backLink}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={C.text} />
        </Pressable>
        <Pressable style={styles.chatHeader}>
          <Avatar name={conversation.participantName} size={36} showVerified={conversation.participantVerified} />
          <View>
            <Text style={styles.chatName}>{conversation.participantName}</Text>
            <Text style={styles.chatRole}>{conversation.participantRole === 'casting_director' ? 'Casting Director' : conversation.participantRole === 'producer' ? 'Producer' : 'Talent'}</Text>
          </View>
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={reversedMessages}
          inverted
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isMe={item.senderId === myId}
              onResend={() => { if (id) void resendMessage(id, item.id); }}
            />
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!reversedMessages.length}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={C.textTertiary} />
              <Text style={styles.emptyChatText}>Start a conversation</Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 8) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={C.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              !!inputText.trim() && styles.sendBtnActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name="send"
              size={18}
              color={inputText.trim() ? C.black : C.textTertiary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
