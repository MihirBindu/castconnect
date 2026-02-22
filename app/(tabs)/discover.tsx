import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { Avatar } from '@/components/Avatar';
import { SkillTag } from '@/components/SkillTag';
import { AvailabilityBadge } from '@/components/StatusBadge';
import { UserProfile, CrewRole, AvailabilityStatus } from '@/lib/types';
import { ALL_CREW_ROLES } from '@/lib/mock-data';
import * as Haptics from 'expo-haptics';

type ExperienceFilter = 'all' | '0-3' | '4-7' | '8-12' | '13+';
type AvailFilter = 'all' | 'available' | 'busy';
type SortOption = 'rating' | 'experience' | 'rate_low' | 'rate_high';

const EXPERIENCE_OPTIONS: { key: ExperienceFilter; label: string }[] = [
  { key: 'all', label: 'Any' },
  { key: '0-3', label: '0-3 yr' },
  { key: '4-7', label: '4-7 yr' },
  { key: '8-12', label: '8-12 yr' },
  { key: '13+', label: '13+ yr' },
];

const LOCATIONS = ['All Locations', 'Mumbai, India', 'Delhi, India', 'Chennai, India', 'Hyderabad, India', 'Bangalore, India', 'Pune, India', 'Goa, India'];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { profiles, crewBasket, addToCrewBasket, isInCrewBasket } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<CrewRole[]>([]);
  const [experienceFilter, setExperienceFilter] = useState<ExperienceFilter>('all');
  const [locationFilter, setLocationFilter] = useState('All Locations');
  const [availFilter, setAvailFilter] = useState<AvailFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [showFilters, setShowFilters] = useState(false);
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const toggleRole = useCallback((role: CrewRole) => {
    Haptics.selectionAsync();
    setSelectedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  }, []);

  const filteredProfiles = useMemo(() => {
    let results = profiles;

    if (selectedRoles.length > 0) {
      results = results.filter(p => selectedRoles.includes(p.crewRole));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.skills.some(s => s.toLowerCase().includes(q)) ||
        p.location.toLowerCase().includes(q) ||
        p.crewRole.toLowerCase().includes(q)
      );
    }

    if (experienceFilter !== 'all') {
      results = results.filter(p => {
        const y = p.experienceYears;
        switch (experienceFilter) {
          case '0-3': return y >= 0 && y <= 3;
          case '4-7': return y >= 4 && y <= 7;
          case '8-12': return y >= 8 && y <= 12;
          case '13+': return y >= 13;
          default: return true;
        }
      });
    }

    if (locationFilter !== 'All Locations') {
      results = results.filter(p => p.location === locationFilter);
    }

    if (availFilter !== 'all') {
      results = results.filter(p => p.availability === availFilter);
    }

    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'rating': return b.rating - a.rating;
        case 'experience': return b.experienceYears - a.experienceYears;
        case 'rate_low': return a.dayRate - b.dayRate;
        case 'rate_high': return b.dayRate - a.dayRate;
        default: return 0;
      }
    });

    return results;
  }, [profiles, searchQuery, selectedRoles, experienceFilter, locationFilter, availFilter, sortBy]);

  const groupedByRole = useMemo(() => {
    if (selectedRoles.length === 0) return null;
    const grouped: Record<string, UserProfile[]> = {};
    for (const p of filteredProfiles) {
      if (!grouped[p.crewRole]) grouped[p.crewRole] = [];
      grouped[p.crewRole].push(p);
    }
    return grouped;
  }, [filteredProfiles, selectedRoles]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (experienceFilter !== 'all') count++;
    if (locationFilter !== 'All Locations') count++;
    if (availFilter !== 'all') count++;
    return count;
  }, [experienceFilter, locationFilter, availFilter]);

  const handleAddToCrew = useCallback((profile: UserProfile) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCrewBasket(profile.id, profile.crewRole);
  }, [addToCrewBasket]);

  const formatRate = (rate: number) => {
    if (rate === 0) return 'N/A';
    if (rate >= 100000) return `${(rate / 100000).toFixed(1)}L/day`;
    return `${(rate / 1000).toFixed(0)}K/day`;
  };

  const renderProfileCard = useCallback(({ item }: { item: UserProfile }) => {
    const inBasket = isInCrewBasket(item.id);
    return (
      <Pressable
        testID={`profile-card-${item.id}`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: '/profile/[id]', params: { id: item.id } });
        }}
        style={({ pressed }) => [styles.profileCard, pressed && styles.cardPressed]}
      >
        <View style={styles.cardTop}>
          <Avatar name={item.name} size={48} showVerified={item.isVerified} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.cardMeta}>
              <Ionicons name="location-outline" size={11} color={Colors.textTertiary} />
              <Text style={styles.cardLocation}>{item.location}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={Colors.primary} />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              <Text style={styles.reviewText}>({item.reviewCount})</Text>
            </View>
            <AvailabilityBadge status={item.availability} />
          </View>
        </View>

        <View style={styles.cardSkills}>
          {item.skills.slice(0, 3).map(skill => (
            <SkillTag key={skill} label={skill} />
          ))}
          {item.skills.length > 3 && <SkillTag label={`+${item.skills.length - 3}`} />}
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.cardStats}>
            <Text style={styles.cardRate}>{formatRate(item.dayRate)}</Text>
            <View style={styles.dot} />
            <Text style={styles.cardExp}>{item.experience}</Text>
          </View>
          <Pressable
            testID={`add-crew-${item.id}`}
            onPress={(e) => {
              e.stopPropagation();
              if (!inBasket) handleAddToCrew(item);
            }}
            style={[styles.addCrewBtn, inBasket && styles.addCrewBtnActive]}
          >
            <Ionicons
              name={inBasket ? 'checkmark-circle' : 'add-circle-outline'}
              size={16}
              color={inBasket ? Colors.accentGreen : Colors.primary}
            />
            <Text style={[styles.addCrewText, inBasket && styles.addCrewTextActive]}>
              {inBasket ? 'Added' : 'Add to Crew'}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    );
  }, [isInCrewBasket, handleAddToCrew]);

  const renderSectionHeader = (role: string, count: number) => (
    <View style={styles.sectionHeader} key={`header-${role}`}>
      <Text style={styles.sectionTitle}>{role}</Text>
      <Text style={styles.sectionCount}>{count} found</Text>
    </View>
  );

  const flatData = useMemo(() => {
    if (!groupedByRole) return filteredProfiles.map(p => ({ type: 'profile' as const, data: p, key: p.id }));

    const items: Array<{ type: 'header' | 'profile'; data: any; key: string }> = [];
    for (const [role, profs] of Object.entries(groupedByRole)) {
      items.push({ type: 'header', data: { role, count: profs.length }, key: `h-${role}` });
      for (const p of profs) {
        items.push({ type: 'profile', data: p, key: p.id });
      }
    }
    return items;
  }, [groupedByRole, filteredProfiles]);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Build Your Crew</Text>
            <Text style={styles.headerSub}>Find and assemble your production team</Text>
          </View>
          {crewBasket.length > 0 && (
            <Pressable
              testID="crew-basket-btn"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/crew-basket');
              }}
              style={styles.basketBtn}
            >
              <Ionicons name="people" size={20} color={Colors.primary} />
              <View style={styles.basketBadge}>
                <Text style={styles.basketBadgeText}>{crewBasket.length}</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={16} color={Colors.textTertiary} />
          <TextInput
            testID="search-input"
            style={styles.searchInput}
            placeholder="Search by name, skill, role..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          testID="filter-btn"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(true);
          }}
          style={styles.filterBtn}
        >
          <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? Colors.primary : Colors.textSecondary} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.roleSection}>
        <Text style={styles.roleSectionLabel}>Select roles to hire</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleChips}>
          {ALL_CREW_ROLES.map(role => {
            const selected = selectedRoles.includes(role);
            return (
              <Pressable
                key={role}
                testID={`role-chip-${role}`}
                onPress={() => toggleRole(role)}
                style={[styles.roleChip, selected && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, selected && styles.roleChipTextActive]}>
                  {role}
                </Text>
                {selected && <Ionicons name="checkmark" size={14} color={Colors.primary} style={{ marginLeft: 2 }} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.resultCount}>
          {filteredProfiles.length} professional{filteredProfiles.length !== 1 ? 's' : ''}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {([
            { key: 'rating', label: 'Top Rated' },
            { key: 'experience', label: 'Most Exp.' },
            { key: 'rate_low', label: 'Rate: Low' },
            { key: 'rate_high', label: 'Rate: High' },
          ] as { key: SortOption; label: string }[]).map(opt => (
            <Pressable
              key={opt.key}
              onPress={() => {
                Haptics.selectionAsync();
                setSortBy(opt.key);
              }}
              style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={flatData}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return renderSectionHeader(item.data.role, item.data.count);
          }
          return renderProfileCard({ item: item.data });
        }}
        keyExtractor={item => item.key}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!flatData.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>No professionals found</Text>
            <Text style={styles.emptySubtext}>Adjust your filters or role selection</Text>
          </View>
        }
      />

      {crewBasket.length > 0 && (
        <Pressable
          testID="floating-basket"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/crew-basket');
          }}
          style={[styles.floatingBasket, { bottom: Platform.OS === 'web' ? 84 + 34 + 16 : 100 + 16 }]}
        >
          <Ionicons name="people" size={20} color={Colors.background} />
          <Text style={styles.floatingBasketText}>
            View Crew ({crewBasket.length})
          </Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.background} />
        </Pressable>
      )}

      <Modal visible={showFilters} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.filterLabel}>Location</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterOptions}>
                {LOCATIONS.map(loc => (
                  <Pressable
                    key={loc}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setLocationFilter(loc);
                    }}
                    style={[styles.filterOption, locationFilter === loc && styles.filterOptionActive]}
                  >
                    <Text style={[styles.filterOptionText, locationFilter === loc && styles.filterOptionTextActive]}>
                      {loc.replace(', India', '')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.filterLabel}>Experience</Text>
              <View style={styles.filterOptionsWrap}>
                {EXPERIENCE_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setExperienceFilter(opt.key);
                    }}
                    style={[styles.filterOption, experienceFilter === opt.key && styles.filterOptionActive]}
                  >
                    <Text style={[styles.filterOptionText, experienceFilter === opt.key && styles.filterOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.filterLabel}>Availability</Text>
              <View style={styles.filterOptionsWrap}>
                {([
                  { key: 'all', label: 'Any' },
                  { key: 'available', label: 'Available' },
                  { key: 'busy', label: 'Busy' },
                ] as { key: AvailFilter; label: string }[]).map(opt => (
                  <Pressable
                    key={opt.key}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAvailFilter(opt.key);
                    }}
                    style={[styles.filterOption, availFilter === opt.key && styles.filterOptionActive]}
                  >
                    <Text style={[styles.filterOptionText, availFilter === opt.key && styles.filterOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setExperienceFilter('all');
                  setLocationFilter('All Locations');
                  setAvailFilter('all');
                }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>Clear All</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowFilters(false)}
                style={styles.applyBtn}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 26,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
  },
  headerSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
  basketBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(212, 168, 83, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  basketBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.accentRed,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  basketBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontFamily: 'DMSans_700Bold',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'DMSans_400Regular',
    height: '100%',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 8,
    color: Colors.background,
    fontFamily: 'DMSans_700Bold',
  },
  roleSection: {
    paddingLeft: 20,
    marginBottom: 6,
  },
  roleSectionLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_500Medium',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleChips: {
    gap: 6,
    paddingRight: 20,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleChipActive: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    borderColor: Colors.primary,
  },
  roleChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
  },
  roleChipTextActive: {
    color: Colors.primary,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 10,
  },
  resultCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_500Medium',
    minWidth: 90,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  sortChipActive: {
    backgroundColor: 'rgba(212, 168, 83, 0.12)',
  },
  sortChipText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_500Medium',
  },
  sortChipTextActive: {
    color: Colors.primary,
  },
  list: {
    padding: 20,
    paddingTop: 4,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    color: Colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
  sectionCount: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
  },
  cardTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
    marginTop: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  cardLocation: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'DMSans_700Bold',
  },
  reviewText: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  cardSkills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardRate: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: 'DMSans_600SemiBold',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
  },
  cardExp: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  addCrewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 168, 83, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.2)',
  },
  addCrewBtnActive: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  addCrewText: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },
  addCrewTextActive: {
    color: Colors.accentGreen,
  },
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
    fontSize: 13,
    color: Colors.textTertiary,
    fontFamily: 'DMSans_400Regular',
  },
  floatingBasket: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    boxShadow: '0px 4px 20px rgba(212, 168, 83, 0.4)',
  },
  floatingBasketText: {
    fontSize: 15,
    color: Colors.background,
    fontFamily: 'DMSans_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    color: Colors.text,
    fontFamily: 'DMSans_700Bold',
  },
  filterLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
    marginBottom: 10,
    marginTop: 16,
  },
  filterOptions: {
    gap: 8,
    paddingBottom: 4,
  },
  filterOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_500Medium',
  },
  filterOptionTextActive: {
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  clearBtnText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: 'DMSans_600SemiBold',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  applyBtnText: {
    fontSize: 14,
    color: Colors.background,
    fontFamily: 'DMSans_700Bold',
  },
});
