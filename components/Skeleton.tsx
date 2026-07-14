import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View, StyleSheet, DimensionValue, StyleProp, ViewStyle } from 'react-native';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';

/** A single pulsing placeholder block (no dependencies — uses Animated). */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const C = useColors();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: C.surfaceLight, opacity }, style]}
    />
  );
}

/** A list of card-shaped skeletons (avatar + two text lines) for loading lists. */
export function SkeletonList({ count = 6 }: { count?: number }) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.list} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={52} height={52} radius={26} />
          <View style={styles.lines}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    list: { paddingHorizontal: 20, paddingTop: 12, gap: 20 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    lines: { flex: 1, gap: 8 },
  });
}
