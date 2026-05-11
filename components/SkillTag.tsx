import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';

interface SkillTagProps {
  label: string;
  variant?: 'default' | 'primary' | 'outline';
  size?: 'small' | 'medium';
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    tag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: C.surfaceLight,
    },
    tagPrimary: {
      backgroundColor: 'rgba(212, 168, 83, 0.15)',
    },
    tagOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: C.border,
    },
    tagMedium: {
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    tagText: {
      fontSize: 12,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    tagTextPrimary: {
      color: C.primary,
    },
    tagTextOutline: {
      color: C.textSecondary,
    },
    tagTextMedium: {
      fontSize: 14,
    },
  });
}

export function SkillTag({ label, variant = 'default', size = 'small' }: SkillTagProps) {
  const C = useColors();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  return (
    <View style={[
      styles.tag,
      variant === 'primary' && styles.tagPrimary,
      variant === 'outline' && styles.tagOutline,
      size === 'medium' && styles.tagMedium,
    ]}>
      <Text style={[
        styles.tagText,
        variant === 'primary' && styles.tagTextPrimary,
        variant === 'outline' && styles.tagTextOutline,
        size === 'medium' && styles.tagTextMedium,
      ]}>
        {label}
      </Text>
    </View>
  );
}
