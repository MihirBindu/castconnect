import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface SkillTagProps {
  label: string;
  variant?: 'default' | 'primary' | 'outline';
  size?: 'small' | 'medium';
}

export function SkillTag({ label, variant = 'default', size = 'small' }: SkillTagProps) {
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

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.surfaceLight,
  },
  tagPrimary: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
  },
  tagOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagMedium: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
  },
  tagTextPrimary: {
    color: Colors.primary,
  },
  tagTextOutline: {
    color: Colors.textSecondary,
  },
  tagTextMedium: {
    fontSize: 14,
  },
});
