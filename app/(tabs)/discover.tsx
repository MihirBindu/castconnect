import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { TalentCard } from '@/components/TalentCard';
import { CastingCallCard } from '@/components/CastingCallCard';
import { UserProfile, CastingCall } from '@/lib/types';
import * as Haptics from 'expo-haptics';

type TabType = 'talent' | 'casting';
type FilterRole = 'all' | 'talent' | 'producer' | 'casting_director';

const ROLE_FILTERS: { key: FilterRole; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'talent', label: 'Talent' },
  { key: 'producer', label: 'Producers' },
  { key: 'casting_director', label: 'Casting Dir.' },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { profiles, castingCalls } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('talent');
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const filteredProfiles = useMemo(() => {
    let results = profiles;
    if (roleFilter !== 'all') {
      results = results.filter(p => p.role === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.skills.some(s => s.toLowerCase().includes(q)) ||
        p.location.toLowerCase().includes(q)
      );
    }
    return results;
  }, [profiles, searchQuery, roleFilter]);

  const filteredCastingCalls = useMemo(() => {
    if (!searchQuery.trim()) return castingCalls;
    const q = searchQuery.toLowerCase();
    return castingCalls.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.roleNeeded.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.skillsRequired.some(s => s.toLowerCase().includes(q))
    );
  }, [castingCalls, searchQuery]);

  const renderTalentItem = ({ item }: { item: UserProfile }) => (
    <View style={styles.cardWrapper}>
      <TalentCard profile={item} />
    </View>
  );

  const renderCastingItem = ({ item }: { item: CastingCall }) => (
    <View style={styles.cardWrapper}>
      <CastingCallCard item={item} />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search talent, roles, skills..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('talent');
          }}
          style={[styles.tab, activeTab === 'talent' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'talent' && styles.tabTextActive]}>
            People
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('casting');
          }}
          style={[styles.tab, activeTab === 'casting' && styles.tabActive]}
        >
          <Text style={[styles.tabText, activeTab === 'casting' && styles.tabTextActive]}>
            Casting Calls
          </Text>
        </Pressable>
      </View>

      {activeTab === 'talent' && (
        <View style={styles.filters}>
          <FlatList
            data={ROLE_FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            scrollEnabled={true}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setRoleFilter(item.key);
                }}
                style={[
                  styles.filterChip,
                  roleFilter === item.key && styles.filterChipActive,
                ]}
              >
                <Text style={[
                  styles.filterText,
                  roleFilter === item.key && styles.filterTextActive,
                ]}>
                  {item.label}
                </Text>
              </Pressable>
            )}
            keyExtractor={item => item.key}
          />
        </View>
      )}

      {activeTab === 'talent' ? (
        <FlatList
          data={filteredProfiles}
          renderItem={renderTalentItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filteredProfiles.length}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try different keywords or filters</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredCastingCalls}
          renderItem={renderCastingItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!filteredCastingCalls.length}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>No casting calls found</Text>
              <Text style={styles.emptySubtext}>Try different keywords</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'DMSans_400Regular',
    height: '100%',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  tabText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_500Medium',
  },
  tabTextActive: {
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
  filters: {
    marginTop: 12,
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
  },
  filterTextActive: {
    color: Colors.primary,
  },
  list: {
    padding: 20,
    gap: 14,
  },
  cardWrapper: {},
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
});
