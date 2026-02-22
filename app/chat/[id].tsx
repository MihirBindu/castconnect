import React, { useState, useRef } from 'react';
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
import Colors from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { Message } from '@/lib/types';
import * as Haptics from 'expo-haptics';

function MessageBubble({ message, isMe }: { message: Message; isMe: boolean }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
          {message.content}
        </Text>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{time}</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { conversations, messages, sendMessage } = useAppState();
  const [inputText, setInputText] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const conversation = conversations.find(c => c.id === id);
  const chatMessages = messages[id || ''] || [];

  const reversedMessages = [...chatMessages].reverse();

  const handleSend = () => {
    if (!inputText.trim() || !id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(id, inputText.trim());
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
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
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
            <MessageBubble message={item} isMe={item.senderId === 'me'} />
          )}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!reversedMessages.length}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyChatText}>Start a conversation</Text>
            </View>
          }
        />

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, Platform.OS === 'web' ? 34 : 8) }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textTertiary}
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
              color={inputText.trim() ? Colors.black : Colors.textTertiary}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
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
    color: Colors.text,
    fontFamily: 'DMSans_600SemiBold',
  },
  chatRole: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  chatArea: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    gap: 6,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: Colors.surfaceLight,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'DMSans_400Regular',
    lineHeight: 20,
  },
  bubbleTextMe: {
    color: Colors.black,
  },
  bubbleTime: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMe: {
    color: 'rgba(0,0,0,0.5)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'DMSans_400Regular',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
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
    color: Colors.textTertiary,
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
    color: Colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
  },
  backLink: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
});
