import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { ApplicationStatus, AvailabilityStatus } from '@/lib/types';

const STATUS_CONFIG: Record<ApplicationStatus, { color: string; icon: string; label: string }> = {
  applied: { color: Colors.statusApplied, icon: 'time-outline', label: 'Applied' },
  shortlisted: { color: Colors.statusShortlisted, icon: 'star-outline', label: 'Shortlisted' },
  selected: { color: Colors.statusSelected, icon: 'checkmark-circle-outline', label: 'Selected' },
  rejected: { color: Colors.statusRejected, icon: 'close-circle-outline', label: 'Rejected' },
};

const AVAILABILITY_CONFIG: Record<AvailabilityStatus, { color: string; label: string }> = {
  available: { color: Colors.accentGreen, label: 'Available' },
  busy: { color: Colors.accentOrange, label: 'Busy' },
  not_available: { color: Colors.accentRed, label: 'Not Available' },
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: `${config.color}18` }]}>
      <Ionicons name={config.icon as any} size={14} color={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const config = AVAILABILITY_CONFIG[status];
  return (
    <View style={styles.availBadge}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.availText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'DMSans_600SemiBold',
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
  },
});
