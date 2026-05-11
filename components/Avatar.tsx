import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';

interface AvatarProps {
  name: string;
  size?: number;
  image?: string | null;
  showVerified?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = ['#D4A853', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    initials: {
      color: '#FFFFFF',
      fontFamily: 'DMSans_700Bold',
    },
    badge: {
      position: 'absolute',
      backgroundColor: C.background,
      borderRadius: 20,
    },
  });
}

export function Avatar({ name, size = 44, image, showVerified }: AvatarProps) {
  const C = useColors();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const bgColor = getAvatarColor(name);
  const fontSize = size * 0.38;

  return (
    <View style={{ position: 'relative' }}>
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
        <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
      </View>
      {showVerified && (
        <View style={[styles.badge, { right: -2, bottom: -2 }]}>
          <Ionicons name="checkmark-circle" size={size * 0.38} color={C.primary} />
        </View>
      )}
    </View>
  );
}
