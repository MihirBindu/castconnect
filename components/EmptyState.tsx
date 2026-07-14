import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';

/**
 * Centered empty/error placeholder for lists and sections. Use tone="error"
 * (with actionLabel/onAction) for a load failure + retry, or the default tone
 * for a genuine empty state with an optional call-to-action.
 */
export function EmptyState({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  tone = 'default',
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
}) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <Ionicons name={icon} size={46} color={tone === 'error' ? C.accentRed : C.textTertiary} />
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.message}>{message}</Text>}
      {!!actionLabel && !!onAction && (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    wrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 72, paddingHorizontal: 40, gap: 10 },
    title: { fontSize: 16, color: C.textSecondary, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' },
    message: { fontSize: 14, color: C.textTertiary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 },
    button: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 20,
    },
    buttonText: { color: C.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
  });
}
