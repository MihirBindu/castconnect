import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { CastingCallCard } from '@/components/CastingCallCard';
import { ApplicationStatusBadge } from '@/components/StatusBadge';
import { CastingCall } from '@/lib/types';
import { INDUSTRY_LABELS } from '@/lib/mock-data';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

type ViewMode = 'browse' | 'applied';

const INDUSTRY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'film', label: 'Film' },
  { key: 'ott', label: 'OTT' },
  { key: 'ad_film', label: 'Ad Film' },
  { key: 'theatre', label: 'Theatre' },
  { key: 'web_series', label: 'Web Series' },
];

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 28,
      color: C.text,
      fontFamily: 'DMSans_700Bold',
    },
    tabs: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 16,
      backgroundColor: C.surface,
      borderRadius: 12,
      padding: 4,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
      borderRadius: 10,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
    },
    tabActive: {
      backgroundColor: C.surfaceElevated,
    },
    tabText: {
      fontSize: 14,
      color: C.textTertiary,
      fontFamily: 'DMSans_500Medium',
    },
    tabTextActive: {
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
    filterRow: {
      height: 44,
      paddingHorizontal: 20,
      marginBottom: 6,
    },
    filterRowContent: {
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
    },
    filterChip: {
      height: 34,
      paddingHorizontal: 16,
      borderRadius: 17,
      backgroundColor: C.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: C.border,
    },
    filterChipActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    filterText: {
      fontSize: 13,
      lineHeight: 17,
      color: C.textSecondary,
      fontFamily: 'DMSans_600SemiBold',
      includeFontPadding: false,
    },
    filterTextActive: {
      color: C.black,
    },
    list: {
      padding: 20,
      gap: 14,
    },
    empty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      color: C.textSecondary,
      fontFamily: 'DMSans_600SemiBold',
    },
    emptySubtext: {
      fontSize: 14,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    appCard: {
      backgroundColor: C.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: C.border,
    },
    appCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 8,
    },
    appTitle: {
      fontSize: 16,
      color: C.text,
      fontFamily: 'DMSans_600SemiBold',
      flex: 1,
    },
    appDate: {
      fontSize: 13,
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
    },
    appNote: {
      fontSize: 13,
      color: C.textSecondary,
      fontFamily: 'DMSans_400Regular',
      fontStyle: 'italic',
      marginTop: 6,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 44,
      gap: 10,
      marginHorizontal: 20,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: C.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: C.text,
      fontFamily: 'DMSans_400Regular',
      height: '100%',
    },
    resultBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 6,
      gap: 6,
    },
    resultDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: C.primary,
    },
    resultCount: {
      fontSize: 12,
      color: C.textTertiary,
      fontFamily: 'DMSans_600SemiBold',
      letterSpacing: 0.3,
    },
  });
}

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { castingCalls, applications } = useAppState();
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [browseSearch, setBrowseSearch] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const filteredCalls = useMemo(() => {
    let results = castingCalls.filter(c => c.status === 'open');
    if (industryFilter !== 'all') {
      results = results.filter(c => c.projectType === industryFilter);
    }
    if (browseSearch.trim()) {
      const q = browseSearch.toLowerCase();
      results = results.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.roleNeeded.toLowerCase().includes(q) ||
        c.projectName.toLowerCase().includes(q)
      );
    }
    return results;
  }, [castingCalls, industryFilter, browseSearch]);

  const renderCallItem = ({ item }: { item: CastingCall }) => (
    <CastingCallCard item={item} />
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Casting</Text>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('browse');
          }}
          style={[styles.tab, viewMode === 'browse' && styles.tabActive]}
        >
          <Ionicons
            name="compass-outline"
            size={18}
            color={viewMode === 'browse' ? C.primary : C.textTertiary}
          />
          <Text style={[styles.tabText, viewMode === 'browse' && styles.tabTextActive]}>
            Browse
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setViewMode('applied');
          }}
          style={[styles.tab, viewMode === 'applied' && styles.tabActive]}
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color={viewMode === 'applied' ? C.primary : C.textTertiary}
          />
          <Text style={[styles.tabText, viewMode === 'applied' && styles.tabTextActive]}>
            My Applications
          </Text>
        </Pressable>
      </View>

      {viewMode === 'browse' && (
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={C.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search productions, roles..."
            placeholderTextColor={C.textTertiary}
            value={browseSearch}
            onChangeText={setBrowseSearch}
          />
          {browseSearch.length > 0 && (
            <Pressable onPress={() => setBrowseSearch('')}>
              <Ionicons name="close-circle" size={16} color={C.textTertiary} />
            </Pressable>
          )}
        </View>
      )}

      {viewMode === 'browse' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          {INDUSTRY_FILTERS.map(item => (
            <Pressable
              key={item.key}
              onPress={() => {
                Haptics.selectionAsync();
                setIndustryFilter(item.key);
              }}
              style={[
                styles.filterChip,
                industryFilter === item.key && styles.filterChipActive,
              ]}
            >
              <Text style={[
                styles.filterText,
                industryFilter === item.key && styles.filterTextActive,
              ]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {viewMode === 'browse' && (
        <View style={styles.resultBar}>
          <View style={styles.resultDot} />
          <Text style={styles.resultCount}>
            {filteredCalls.length} open call{filteredCalls.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {viewMode === 'browse' ? (
        <FlatList
          style={{ flex: 1 }}
          data={filteredCalls}
          renderItem={renderCallItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="film-outline" size={48} color={C.textTertiary} />
              <Text style={styles.emptyText}>No casting calls found</Text>
              <Text style={styles.emptySubtext}>Check back later for new opportunities</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={applications}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/casting/[id]', params: { id: item.castingCallId } });
              }}
              style={({ pressed }) => [styles.appCard, pressed && { opacity: 0.75 }]}
            >
              <View style={styles.appCardTop}>
                <Text style={styles.appTitle} numberOfLines={2}>{item.castingCallTitle}</Text>
                <ApplicationStatusBadge status={item.status} />
                <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
              </View>
              <Text style={styles.appDate}>
                Applied on {new Date(item.appliedAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              {item.note ? <Text style={styles.appNote}>{item.note}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-outline" size={48} color={C.textTertiary} />
              <Text style={styles.emptyText}>No applications yet</Text>
              <Text style={styles.emptySubtext}>Start applying to casting calls</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
