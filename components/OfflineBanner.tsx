import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';

/**
 * Thin banner shown while the app is serving cached data because the network is
 * unavailable. Self-contained — reads `isOffline` from the app store, so screens
 * only need to drop <OfflineBanner /> below their header.
 */
export function OfflineBanner() {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { isOffline } = useAppState();

  if (!isOffline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={15} color={C.black} />
      <Text style={styles.text}>You&rsquo;re offline — showing saved data.</Text>
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: C.accentOrange,
      paddingVertical: 7,
      paddingHorizontal: 16,
    },
    text: {
      color: C.black,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
    },
  });
}
