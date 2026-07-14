import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { useProfileGate } from '@/lib/ProfileGate';
import { getProfile, savePortfolio, PortfolioInput } from '@/lib/api/profiles';
import { uploadPortfolioImage, deletePortfolioMedia } from '@/lib/api/portfolio';
import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';
import {
  ProfilePhoto,
  PortfolioPhoto,
  AuditionReel,
  Showreel,
  NotableWork,
  Award,
  SHOWREEL_CATEGORY_OPTIONS,
  NOTABLE_WORK_TYPE_OPTIONS,
  AWARD_CATEGORY_OPTIONS,
} from '@/lib/types';
import {
  PickedFile,
  validateImageFile,
  validateReelTitle,
  validateYearNotFuture,
  validateDescription,
  validateVideoLink,
  videoLinkWarning,
  validateOptionalHttpsUrl,
  sanitizeText,
  MAX_PORTFOLIO_PHOTOS,
  MAX_AUDITION_REELS,
  MAX_SHOWREELS,
  MAX_NOTABLE_WORK,
  MAX_AWARDS,
  CAPTION_MAX,
  DESCRIPTION_MAX,
} from '@/lib/portfolioValidation';

const log = createLogger('Portfolio');

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function pickImages(multiple: boolean): Promise<PickedFile[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Please allow photo access to upload images.');
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: !multiple, // basic square crop/reposition for the single profile photo
    aspect: [1, 1],
    quality: 0.9,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? MAX_PORTFOLIO_PHOTOS : 1,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({
    uri: a.uri,
    fileName: a.fileName ?? null,
    mimeType: a.mimeType ?? null,
    fileSize: a.fileSize ?? null,
    width: a.width ?? null,
    height: a.height ?? null,
  }));
}

export default function PortfolioScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { session, updateProfile } = useAppState();
  const { setStatus } = useProfileGate();
  const userId = session?.user?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<ProfilePhoto | null>(null);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [reels, setReels] = useState<AuditionReel[]>([]);
  const [showreels, setShowreels] = useState<Showreel[]>([]);
  const [notable, setNotable] = useState<NotableWork[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);

  const [photoUploading, setPhotoUploading] = useState(false);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftState, setDraftState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>('photo');

  // Entry editor modal state
  const [editor, setEditor] = useState<
    | { kind: 'reel'; value: AuditionReel | null }
    | { kind: 'showreel'; value: Showreel | null }
    | { kind: 'notable'; value: NotableWork | null }
    | { kind: 'award'; value: Award | null }
    | null
  >(null);

  const hydratedRef = useRef(false);
  const submittingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const anyUploading = photoUploading || photosUploading;

  // ── Prefill ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const p = await getProfile(userId);
        if (cancelled || !p) return;
        setProfilePhoto(p.profilePhoto ?? null);
        setPhotos(p.portfolioPhotos ?? []);
        setReels(p.auditionReels ?? []);
        setShowreels(p.showreels ?? []);
        setNotable(p.notableWork ?? []);
        setAwards(p.awards ?? []);
      } catch (err: unknown) {
        if (!cancelled) log.warn('Prefill failed', { message: err instanceof Error ? err.message : String(err) });
      } finally {
        if (!cancelled) { setLoading(false); hydratedRef.current = true; }
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const currentInput = useCallback(
    (): PortfolioInput => ({
      profilePhoto,
      portfolioPhotos: photos,
      auditionReels: reels,
      showreels,
      notableWork: notable,
      awards,
    }),
    [profilePhoto, photos, reels, showreels, notable, awards],
  );

  // ── Debounced draft autosave ─────────────────────────────────────────────────
  useEffect(() => {
    if (!hydratedRef.current || saving) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    setDraftState('saving');
    draftTimer.current = setTimeout(async () => {
      const res = await savePortfolio(userId, currentInput(), { complete: false });
      setDraftState(res.ok ? 'saved' : 'idle');
    }, 1500);
    return () => { if (draftTimer.current) clearTimeout(draftTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilePhoto, photos, reels, showreels, notable, awards]);

  // ── Profile photo ─────────────────────────────────────────────────────────────
  const handlePickProfilePhoto = async () => {
    const picked = await pickImages(false);
    if (picked.length === 0) return;
    const file = picked[0];
    const err = validateImageFile(file);
    if (err) { Alert.alert('Profile photo', err); return; }
    setPhotoUploading(true);
    const prev = profilePhoto;
    try {
      const res = await uploadPortfolioImage(userId, 'profile', file);
      if (!res.ok) { Alert.alert('Upload failed', res.error); return; }
      // Only remove the old file after the replacement succeeds.
      setProfilePhoto({ mediaId: res.mediaId, path: res.path, url: res.url, status: 'COMPLETED' });
      if (prev?.path && prev.path !== res.path) deletePortfolioMedia('portfolio-media', prev.path);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemoveProfilePhoto = () => {
    if (!profilePhoto) return;
    Alert.alert('Remove profile photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const path = profilePhoto.path;
          setProfilePhoto(null);
          if (path) deletePortfolioMedia('portfolio-media', path);
        },
      },
    ]);
  };

  // ── Portfolio photos ────────────────────────────────────────────────────────
  const handleAddPhotos = async () => {
    const remaining = MAX_PORTFOLIO_PHOTOS - photos.length;
    if (remaining <= 0) { Alert.alert('Limit reached', `You can add up to ${MAX_PORTFOLIO_PHOTOS} photos.`); return; }
    const picked = await pickImages(true);
    if (picked.length === 0) return;
    setPhotosUploading(true);
    try {
      let order = photos.length;
      for (const file of picked.slice(0, remaining)) {
        const err = validateImageFile(file);
        if (err) { Alert.alert('Skipped a photo', err); continue; }
        const res = await uploadPortfolioImage(userId, 'photos', file);
        if (!res.ok) { Alert.alert('One upload failed', res.error); continue; } // keep the rest
        const photo: PortfolioPhoto = {
          mediaId: res.mediaId, path: res.path, url: res.url,
          caption: '', displayOrder: order++, status: 'COMPLETED',
        };
        setPhotos((prev) => [...prev, photo]);
      }
    } finally {
      setPhotosUploading(false);
    }
  };

  const setCaption = (mediaId: string, caption: string) =>
    setPhotos((prev) => prev.map((p) => (p.mediaId === mediaId ? { ...p, caption: caption.slice(0, CAPTION_MAX) } : p)));

  const removePhoto = (photo: PortfolioPhoto) => {
    Alert.alert('Remove photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setPhotos((prev) => prev.filter((p) => p.mediaId !== photo.mediaId).map((p, i) => ({ ...p, displayOrder: i })));
          if (photo.path) deletePortfolioMedia('portfolio-media', photo.path);
        },
      },
    ]);
  };

  const movePhoto = (index: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next.map((p, i) => ({ ...p, displayOrder: i }));
    });
  };

  // ── Entry list helpers ────────────────────────────────────────────────────────
  const removeEntry = <T extends { id: string }>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    id: string,
    label: string,
  ) => {
    Alert.alert(`Remove this ${label}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setter((prev) => prev.filter((e) => e.id !== id)) },
    ]);
  };

  const saveEditorEntry = (
    kind: 'reel' | 'showreel' | 'notable' | 'award',
    value: AuditionReel | Showreel | NotableWork | Award,
  ) => {
    const upsert = <T extends { id: string }>(prev: T[], v: T) => {
      const i = prev.findIndex((e) => e.id === v.id);
      if (i === -1) return [...prev, v];
      const next = [...prev]; next[i] = v; return next;
    };
    if (kind === 'reel') setReels((p) => upsert(p, value as AuditionReel));
    else if (kind === 'showreel') setShowreels((p) => upsert(p, value as Showreel));
    else if (kind === 'notable') setNotable((p) => upsert(p, value as NotableWork));
    else setAwards((p) => upsert(p, value as Award));
    setEditor(null);
  };

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleSignOut = async () => { await supabase.auth.signOut().catch(() => {}); };

  const handleBack = () => {
    const go = () => router.replace('/onboarding/professional-profile' as never);
    if (anyUploading) {
      Alert.alert('Uploads in progress', 'Please wait for uploads to finish before going back.', [{ text: 'OK' }]);
      return;
    }
    go();
  };

  const persist = async (complete: boolean) => {
    if (complete && anyUploading) {
      setServerError('Please wait for all uploads to finish before completing your profile.');
      return;
    }
    if (complete && !profilePhoto) {
      setSubmitAttempted(true);
      setServerError('Please upload a profile photo to complete your profile.');
      setOpenSection('photo');
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setServerError(null);
    if (draftTimer.current) clearTimeout(draftTimer.current);
    try {
      const res = await savePortfolio(userId, currentInput(), { complete });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const p = res.profile;
        updateProfile({
          profilePhoto: p.profilePhoto,
          portfolioPhotos: p.portfolioPhotos,
          auditionReels: p.auditionReels,
          showreels: p.showreels,
          notableWork: p.notableWork,
          awards: p.awards,
          profileImage: p.profilePhoto?.url ?? undefined,
          portfolioCompleted: p.portfolioCompleted,
          onboardingStatus: p.onboardingStatus,
          updatedAt: p.updatedAt,
        });
        if (complete) {
          setStatus(p.onboardingStatus ?? 'COMPLETED');
          router.replace('/(tabs)');
        } else {
          setDraftState('saved');
          Alert.alert('Draft saved', 'You can come back and finish your portfolio anytime.');
        }
        return;
      }
      setServerError(res.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      scrollRef.current?.scrollToEnd({ animated: true });
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const topPadding = insets.top + (Platform.OS === 'web' ? 24 : 12);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topPadding }]}>
        <View style={styles.skeletonWrap}>
          {[200, 120, 120, 120, 120, 120].map((w, i) => (
            <View key={i} style={[styles.skeletonBar, { width: w }]} />
          ))}
        </View>
      </View>
    );
  }

  const photoMissing = submitAttempted && !profilePhoto;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        <Pressable onPress={handleBack} accessibilityRole="button" accessibilityLabel="Back to professional profile" hitSlop={8} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.stepText}>Step 3 of 3</Text>
        <Pressable onPress={handleSignOut} accessibilityRole="button" accessibilityLabel="Sign out" hitSlop={8} style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>
      <View style={styles.progressTrack}><View style={styles.progressFill} /></View>

      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Build Your Portfolio</Text>
          {draftState !== 'idle' && (
            <Text style={styles.draftText}>{draftState === 'saving' ? 'Saving…' : 'Draft saved'}</Text>
          )}
        </View>
        <Text style={styles.subtitle}>Showcase your work. Only a profile photo is required — everything else is optional.</Text>

        {/* 1. Profile Photo (required) */}
        <Section styles={styles} C={C} id="photo" title="Profile Photo" required done={!!profilePhoto} open={openSection === 'photo'} onToggle={setOpenSection} error={photoMissing ? 'Please upload a profile photo.' : null}>
          {profilePhoto ? (
            <View style={styles.profilePhotoRow}>
              <Image source={{ uri: profilePhoto.url }} style={styles.profilePhoto} contentFit="cover" transition={150} />
              <View style={{ flex: 1, gap: 8 }}>
                <Pressable onPress={handlePickProfilePhoto} disabled={photoUploading} style={styles.secondaryBtn} accessibilityRole="button" accessibilityLabel="Replace profile photo">
                  <Text style={styles.secondaryBtnText}>{photoUploading ? 'Uploading…' : 'Replace'}</Text>
                </Pressable>
                <Pressable onPress={handleRemoveProfilePhoto} disabled={photoUploading} style={styles.dangerBtn} accessibilityRole="button" accessibilityLabel="Remove profile photo">
                  <Text style={styles.dangerBtnText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={handlePickProfilePhoto} disabled={photoUploading} style={styles.uploadTile} accessibilityRole="button" accessibilityLabel="Upload profile photo">
              {photoUploading ? <ActivityIndicator color={C.primary} /> : <Ionicons name="camera-outline" size={28} color={C.primary} />}
              <Text style={styles.uploadTileText}>{photoUploading ? 'Uploading…' : 'Upload profile photo'}</Text>
              <Text style={styles.helpText}>JPG, PNG, or WebP · up to 10 MB · min 500×500</Text>
            </Pressable>
          )}
        </Section>

        {/* 2. Portfolio Photos */}
        <Section styles={styles} C={C} id="photos" title="Portfolio Photos" count={photos.length} open={openSection === 'photos'} onToggle={setOpenSection}>
          <View style={styles.grid}>
            {photos.map((p, i) => (
              <View key={p.mediaId} style={styles.gridItem}>
                <Image source={{ uri: p.url }} style={styles.gridImage} contentFit="cover" transition={150} />
                <View style={styles.gridActions}>
                  <Pressable onPress={() => movePhoto(i, -1)} hitSlop={6} accessibilityLabel="Move left"><Ionicons name="arrow-back-circle" size={22} color={C.white} /></Pressable>
                  <Pressable onPress={() => movePhoto(i, 1)} hitSlop={6} accessibilityLabel="Move right"><Ionicons name="arrow-forward-circle" size={22} color={C.white} /></Pressable>
                  <Pressable onPress={() => removePhoto(p)} hitSlop={6} accessibilityLabel="Delete photo"><Ionicons name="trash" size={20} color={C.white} /></Pressable>
                </View>
                <TextInput
                  style={styles.captionInput}
                  value={p.caption}
                  onChangeText={(t) => setCaption(p.mediaId, t)}
                  placeholder="Add a caption"
                  placeholderTextColor={C.textTertiary}
                  maxLength={CAPTION_MAX}
                  accessibilityLabel={`Caption for photo ${i + 1}`}
                />
              </View>
            ))}
          </View>
          <Pressable onPress={handleAddPhotos} disabled={photosUploading} style={styles.addTile} accessibilityRole="button" accessibilityLabel="Add portfolio photos">
            {photosUploading ? <ActivityIndicator color={C.primary} /> : <Ionicons name="add" size={22} color={C.primary} />}
            <Text style={styles.addTileText}>{photosUploading ? 'Uploading…' : `Add photos (${photos.length}/${MAX_PORTFOLIO_PHOTOS})`}</Text>
          </Pressable>
        </Section>

        {/* 3. Audition Reels */}
        <Section styles={styles} C={C} id="reels" title="Audition Reels" count={reels.length} open={openSection === 'reels'} onToggle={setOpenSection}>
          {reels.map((r) => (
            <EntryRow key={r.id} styles={styles} C={C} title={r.title} subtitle={[r.role, r.language].filter(Boolean).join(' · ')} onEdit={() => setEditor({ kind: 'reel', value: r })} onDelete={() => removeEntry(setReels, r.id, 'reel')} />
          ))}
          {reels.length < MAX_AUDITION_REELS && (
            <AddButton styles={styles} C={C} label="Add audition reel" onPress={() => setEditor({ kind: 'reel', value: null })} />
          )}
        </Section>

        {/* 4. Showreels */}
        <Section styles={styles} C={C} id="showreels" title="Showreels" count={showreels.length} open={openSection === 'showreels'} onToggle={setOpenSection}>
          {showreels.map((s) => (
            <EntryRow key={s.id} styles={styles} C={C} title={s.title} subtitle={[s.category === 'Other' ? s.customCategory : s.category, s.year].filter(Boolean).join(' · ')} onEdit={() => setEditor({ kind: 'showreel', value: s })} onDelete={() => removeEntry(setShowreels, s.id, 'showreel')} />
          ))}
          {showreels.length < MAX_SHOWREELS && (
            <AddButton styles={styles} C={C} label="Add showreel" onPress={() => setEditor({ kind: 'showreel', value: null })} />
          )}
        </Section>

        {/* 5. Previous Notable Work */}
        <Section styles={styles} C={C} id="notable" title="Previous Notable Work" count={notable.length} open={openSection === 'notable'} onToggle={setOpenSection}>
          {notable.length === 0 && <Text style={styles.emptyState}>Add projects that best represent your professional experience.</Text>}
          {notable.map((n) => (
            <EntryRow key={n.id} styles={styles} C={C} title={n.projectTitle} subtitle={[n.role, n.projectType, n.releaseYear].filter(Boolean).join(' · ')} onEdit={() => setEditor({ kind: 'notable', value: n })} onDelete={() => removeEntry(setNotable, n.id, 'project')} />
          ))}
          {notable.length < MAX_NOTABLE_WORK && (
            <AddButton styles={styles} C={C} label="Add project" onPress={() => setEditor({ kind: 'notable', value: null })} />
          )}
        </Section>

        {/* 6. Awards and Recognition */}
        <Section styles={styles} C={C} id="awards" title="Awards & Recognition" count={awards.length} open={openSection === 'awards'} onToggle={setOpenSection}>
          {awards.map((a) => (
            <EntryRow key={a.id} styles={styles} C={C} title={a.title} subtitle={[a.issuingOrganisation, a.category === 'Other' ? a.customCategory : a.category, a.year].filter(Boolean).join(' · ')} onEdit={() => setEditor({ kind: 'award', value: a })} onDelete={() => removeEntry(setAwards, a.id, 'award')} />
          ))}
          {awards.length < MAX_AWARDS && (
            <AddButton styles={styles} C={C} label="Add award or recognition" onPress={() => setEditor({ kind: 'award', value: null })} />
          )}
        </Section>

        {serverError && (
          <View style={styles.errorBanner} accessibilityLiveRegion="polite"><Text style={styles.errorBannerText}>{serverError}</Text></View>
        )}

        <Pressable onPress={() => persist(true)} disabled={saving} accessibilityRole="button" accessibilityState={{ disabled: saving }} style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>
          {saving ? (
            <View style={styles.savingRow}><ActivityIndicator color={C.black} /><Text style={styles.saveBtnText}>Completing Your Profile…</Text></View>
          ) : (
            <Text style={styles.saveBtnText}>Complete Profile</Text>
          )}
        </Pressable>
        <Pressable onPress={() => persist(false)} disabled={saving} accessibilityRole="button" style={styles.draftBtn}>
          <Text style={styles.draftBtnText}>Save as Draft</Text>
        </Pressable>
        <Text style={styles.requiredHint}>A profile photo is required to finish. You can update your portfolio later from settings.</Text>
      </ScrollView>

      {editor && (
        <EntryEditorModal
          styles={styles}
          C={C}
          editor={editor}
          existingReelLinks={reels.map((r) => r.externalUrl ?? '')}
          existingShowreelLinks={showreels.map((s) => s.externalUrl ?? '')}
          userId={userId}
          onClose={() => setEditor(null)}
          onSave={saveEditorEntry}
        />
      )}
    </View>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────────
function Section({
  styles, C, id, title, required, count, done, open, onToggle, error, children,
}: {
  styles: ReturnType<typeof makeStyles>;
  C: ThemeColors;
  id: string;
  title: string;
  required?: boolean;
  count?: number;
  done?: boolean;
  open: boolean;
  onToggle: (id: string | null) => void;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, error && styles.sectionError]}>
      <Pressable onPress={() => onToggle(open ? null : id)} style={styles.sectionHeader} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={styles.sectionTitleRow}>
          {done && <Ionicons name="checkmark-circle" size={18} color={C.accentGreen} />}
          <Text style={styles.sectionTitle}>{title}{required && <Text style={styles.asterisk}> *</Text>}</Text>
          {typeof count === 'number' && count > 0 && <Text style={styles.sectionCount}>{count}</Text>}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.textSecondary} />
      </Pressable>
      {error && <Text style={styles.fieldError}>{error}</Text>}
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function AddButton({ styles, C, label, onPress }: { styles: ReturnType<typeof makeStyles>; C: ThemeColors; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.addTile} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name="add" size={20} color={C.primary} />
      <Text style={styles.addTileText}>{label}</Text>
    </Pressable>
  );
}

function EntryRow({
  styles, C, title, subtitle, onEdit, onDelete,
}: {
  styles: ReturnType<typeof makeStyles>;
  C: ThemeColors;
  title: string;
  subtitle: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.entryRow}>
      <Pressable style={{ flex: 1 }} onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${title}`}>
        <Text style={styles.entryTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.entrySubtitle} numberOfLines={1}>{subtitle}</Text>}
      </Pressable>
      <Pressable onPress={onEdit} hitSlop={6} accessibilityLabel="Edit"><Ionicons name="create-outline" size={20} color={C.textSecondary} /></Pressable>
      <Pressable onPress={onDelete} hitSlop={6} accessibilityLabel="Delete" style={{ marginLeft: 12 }}><Ionicons name="trash-outline" size={20} color={C.accentRed} /></Pressable>
    </View>
  );
}

// ── Entry editor modal ──────────────────────────────────────────────────────────
type EditorState =
  | { kind: 'reel'; value: AuditionReel | null }
  | { kind: 'showreel'; value: Showreel | null }
  | { kind: 'notable'; value: NotableWork | null }
  | { kind: 'award'; value: Award | null };

function EntryEditorModal({
  styles, C, editor, existingReelLinks, existingShowreelLinks, onClose, onSave,
}: {
  styles: ReturnType<typeof makeStyles>;
  C: ThemeColors;
  editor: EditorState;
  existingReelLinks: string[];
  existingShowreelLinks: string[];
  userId: string;
  onClose: () => void;
  onSave: (kind: 'reel' | 'showreel' | 'notable' | 'award', value: AuditionReel | Showreel | NotableWork | Award) => void;
}) {
  // Shared field state; only the relevant fields are used per kind.
  const v = editor.value as unknown as Partial<AuditionReel & Showreel & NotableWork & Award> | null;
  const [title, setTitle] = useState(v?.title ?? (v as Partial<NotableWork> | null)?.projectTitle ?? '');
  const [description, setDescription] = useState(v?.description ?? '');
  const [role, setRole] = useState(v?.role ?? '');
  const [language, setLanguage] = useState((v as AuditionReel | null)?.language ?? '');
  const [videoUrl, setVideoUrl] = useState((v as AuditionReel | Showreel | null)?.externalUrl ?? '');
  const [category, setCategory] = useState((v as Showreel | Award | null)?.category ?? '');
  const [customCategory, setCustomCategory] = useState((v as Showreel | Award | null)?.customCategory ?? '');
  const [projectType, setProjectType] = useState((v as NotableWork | null)?.projectType ?? '');
  const [productionCompany, setProductionCompany] = useState((v as NotableWork | null)?.productionCompany ?? '');
  const [issuingOrg, setIssuingOrg] = useState((v as Award | null)?.issuingOrganisation ?? '');
  const [projectUrl, setProjectUrl] = useState((v as NotableWork | null)?.projectUrl ?? '');
  const [verificationUrl, setVerificationUrl] = useState((v as Award | null)?.verificationUrl ?? '');
  const [yearText, setYearText] = useState(
    (v as Showreel | Award | null)?.year != null
      ? String((v as Showreel | Award).year)
      : (v as NotableWork | null)?.releaseYear != null
        ? String((v as NotableWork).releaseYear)
        : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const kind = editor.kind;
  const yearNum = yearText.trim() ? parseInt(yearText, 10) : null;

  const submit = () => {
    setError(null);
    const id = editor.value?.id ?? genId();

    if (kind === 'reel') {
      const tErr = validateReelTitle(title); if (tErr) return setError(tErr);
      const dErr = validateDescription(description); if (dErr) return setError(dErr);
      const lErr = validateVideoLink(videoUrl); if (lErr) return setError(lErr);
      const dup = existingReelLinks.some((l) => l && l.trim() === videoUrl.trim() && videoUrl.trim() !== ((editor.value as AuditionReel | null)?.externalUrl ?? ''));
      if (dup) return setError('This link has already been added.');
      onSave('reel', {
        id, title: title.trim(), description: sanitizeText(description), role: role.trim(), language: language.trim(),
        sourceType: 'EXTERNAL_LINK', externalUrl: videoUrl.trim(), status: 'COMPLETED',
      });
      return;
    }
    if (kind === 'showreel') {
      const tErr = validateReelTitle(title); if (tErr) return setError(tErr);
      if (!category) return setError('Please select a category.');
      if (category === 'Other' && !customCategory.trim()) return setError('Please enter a custom category.');
      const yErr = validateYearNotFuture(yearNum); if (yErr) return setError(yErr);
      const lErr = validateVideoLink(videoUrl); if (lErr) return setError(lErr);
      const dup = existingShowreelLinks.some((l) => l && l.trim() === videoUrl.trim() && videoUrl.trim() !== ((editor.value as Showreel | null)?.externalUrl ?? ''));
      if (dup) return setError('This link has already been added.');
      onSave('showreel', {
        id, title: title.trim(), category, customCategory: category === 'Other' ? customCategory.trim() : undefined,
        description: sanitizeText(description), year: yearNum, sourceType: 'EXTERNAL_LINK', externalUrl: videoUrl.trim(), status: 'COMPLETED',
      });
      return;
    }
    if (kind === 'notable') {
      if (!title.trim()) return setError('Please enter a project title.');
      if (!role.trim()) return setError('Please enter your role or contribution.');
      const uErr = validateOptionalHttpsUrl(projectUrl); if (uErr) return setError(uErr);
      const yErr = validateYearNotFuture(yearNum); if (yErr) return setError(yErr);
      const dErr = validateDescription(description); if (dErr) return setError(dErr);
      onSave('notable', {
        id, projectTitle: title.trim(), projectType, role: role.trim(), productionCompany: productionCompany.trim(),
        releaseYear: yearNum, projectUrl: projectUrl.trim() || null, description: sanitizeText(description),
      });
      return;
    }
    // award
    if (!title.trim()) return setError('Please enter a title.');
    if (!issuingOrg.trim()) return setError('Please enter the issuing organisation.');
    if (!category) return setError('Please select a category.');
    if (category === 'Other' && !customCategory.trim()) return setError('Please enter a custom category.');
    const yErr = validateYearNotFuture(yearNum); if (yErr) return setError(yErr);
    const uErr = validateOptionalHttpsUrl(verificationUrl); if (uErr) return setError(uErr);
    const dErr = validateDescription(description); if (dErr) return setError(dErr);
    onSave('award', {
      id, title: title.trim(), issuingOrganisation: issuingOrg.trim(), category,
      customCategory: category === 'Other' ? customCategory.trim() : undefined,
      year: yearNum, description: sanitizeText(description), verificationUrl: verificationUrl.trim() || null,
    });
  };

  const heading =
    kind === 'reel' ? 'Audition Reel' : kind === 'showreel' ? 'Showreel' : kind === 'notable' ? 'Notable Work' : 'Award / Recognition';

  const catOptions = kind === 'showreel' ? SHOWREEL_CATEGORY_OPTIONS : AWARD_CATEGORY_OPTIONS;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{heading}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close"><Ionicons name="close" size={24} color={C.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
            <ModalField styles={styles} label={kind === 'notable' ? 'Project title' : 'Title'} required>
              <TextInput style={styles.modalInput} value={title} onChangeText={setTitle} placeholder="Title" placeholderTextColor={C.textTertiary} maxLength={100} />
            </ModalField>

            {(kind === 'reel') && (
              <>
                <ModalField styles={styles} label="Role or character"><TextInput style={styles.modalInput} value={role} onChangeText={setRole} placeholder="e.g. Lead Actor" placeholderTextColor={C.textTertiary} maxLength={100} /></ModalField>
                <ModalField styles={styles} label="Language"><TextInput style={styles.modalInput} value={language} onChangeText={setLanguage} placeholder="e.g. Hindi" placeholderTextColor={C.textTertiary} maxLength={40} /></ModalField>
              </>
            )}

            {(kind === 'showreel' || kind === 'award') && (
              <ModalField styles={styles} label="Category" required>
                <View style={styles.chipsWrap}>
                  {catOptions.map((c) => (
                    <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: category === c }}>
                      <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
                {category === 'Other' && (
                  <TextInput style={[styles.modalInput, { marginTop: 8 }]} value={customCategory} onChangeText={setCustomCategory} placeholder="Enter category" placeholderTextColor={C.textTertiary} maxLength={50} />
                )}
              </ModalField>
            )}

            {kind === 'notable' && (
              <>
                <ModalField styles={styles} label="Project type">
                  <View style={styles.chipsWrap}>
                    {NOTABLE_WORK_TYPE_OPTIONS.map((c) => (
                      <Pressable key={c} onPress={() => setProjectType(c)} style={[styles.chip, projectType === c && styles.chipActive]}>
                        <Text style={[styles.chipText, projectType === c && styles.chipTextActive]}>{c}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ModalField>
                <ModalField styles={styles} label="Role or contribution" required><TextInput style={styles.modalInput} value={role} onChangeText={setRole} placeholder="e.g. Supporting Actor" placeholderTextColor={C.textTertiary} maxLength={100} /></ModalField>
                <ModalField styles={styles} label="Production company / client"><TextInput style={styles.modalInput} value={productionCompany} onChangeText={setProductionCompany} placeholder="Optional" placeholderTextColor={C.textTertiary} maxLength={100} /></ModalField>
              </>
            )}

            {kind === 'award' && (
              <ModalField styles={styles} label="Issuing organisation" required><TextInput style={styles.modalInput} value={issuingOrg} onChangeText={setIssuingOrg} placeholder="e.g. Example Film Festival" placeholderTextColor={C.textTertiary} maxLength={120} /></ModalField>
            )}

            {(kind === 'showreel' || kind === 'notable' || kind === 'award') && (
              <ModalField styles={styles} label="Year">
                <TextInput style={styles.modalInput} value={yearText} onChangeText={(t) => setYearText(t.replace(/[^0-9]/g, ''))} placeholder="e.g. 2025" placeholderTextColor={C.textTertiary} keyboardType="number-pad" maxLength={4} />
              </ModalField>
            )}

            {(kind === 'reel' || kind === 'showreel') && (
              <ModalField styles={styles} label="Video link (YouTube, Vimeo, Drive, Dropbox)" required>
                <TextInput style={styles.modalInput} value={videoUrl} onChangeText={(t) => { setVideoUrl(t); setWarning(videoLinkWarning(t)); }} placeholder="https://…" placeholderTextColor={C.textTertiary} autoCapitalize="none" keyboardType="url" />
                {!!warning && <Text style={styles.fieldWarning}>{warning}</Text>}
              </ModalField>
            )}

            {kind === 'notable' && (
              <ModalField styles={styles} label="Project link"><TextInput style={styles.modalInput} value={projectUrl} onChangeText={setProjectUrl} placeholder="https://… (optional)" placeholderTextColor={C.textTertiary} autoCapitalize="none" keyboardType="url" /></ModalField>
            )}
            {kind === 'award' && (
              <ModalField styles={styles} label="Verification link"><TextInput style={styles.modalInput} value={verificationUrl} onChangeText={setVerificationUrl} placeholder="https://… (optional)" placeholderTextColor={C.textTertiary} autoCapitalize="none" keyboardType="url" /></ModalField>
            )}

            <ModalField styles={styles} label="Description">
              <TextInput style={[styles.modalInput, styles.modalTextArea]} value={description} onChangeText={(t) => setDescription(t.slice(0, DESCRIPTION_MAX))} placeholder="Optional" placeholderTextColor={C.textTertiary} multiline maxLength={DESCRIPTION_MAX} />
              <Text style={styles.counter}>{description.trim().length}/{DESCRIPTION_MAX}</Text>
            </ModalField>

            {!!error && <Text style={styles.fieldError}>{error}</Text>}

            <Pressable onPress={submit} style={styles.saveBtn} accessibilityRole="button" accessibilityLabel="Save entry">
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalField({ styles, label, required, children }: { styles: ReturnType<typeof makeStyles>; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}{required && <Text style={styles.asterisk}> *</Text>}</Text>
      {children}
    </View>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    backText: { color: C.text, fontFamily: 'DMSans_500Medium', fontSize: 15 },
    stepText: { color: C.textSecondary, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
    signOutBtn: { paddingVertical: 6, paddingHorizontal: 8 },
    signOutText: { color: C.textSecondary, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
    progressTrack: { height: 4, backgroundColor: C.surfaceLight, marginHorizontal: 20, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
    progressFill: { width: '100%', height: '100%', backgroundColor: C.primary },
    scroll: { paddingHorizontal: 20, paddingBottom: 60, maxWidth: 620, width: '100%', alignSelf: 'center' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    draftText: { color: C.textTertiary, fontFamily: 'DMSans_500Medium', fontSize: 12 },
    title: { fontSize: 26, fontFamily: 'DMSans_700Bold', color: C.text, letterSpacing: -0.4 },
    subtitle: { fontSize: 15, fontFamily: 'DMSans_400Regular', color: C.textSecondary, lineHeight: 22, marginTop: 8, marginBottom: 20 },

    section: { borderWidth: 1, borderColor: C.border, borderRadius: 14, marginBottom: 14, backgroundColor: C.surface, overflow: 'hidden' },
    sectionError: { borderColor: C.accentRed },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', color: C.text },
    sectionCount: { fontSize: 12, fontFamily: 'DMSans_700Bold', color: C.black, backgroundColor: C.primary, minWidth: 20, textAlign: 'center', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
    asterisk: { color: C.primary },
    sectionBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },

    uploadTile: { borderWidth: 1, borderStyle: 'dashed', borderColor: C.border, borderRadius: 12, paddingVertical: 26, alignItems: 'center', gap: 6 },
    uploadTileText: { color: C.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
    helpText: { color: C.textTertiary, fontFamily: 'DMSans_400Regular', fontSize: 12, textAlign: 'center' },
    profilePhotoRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    profilePhoto: { width: 96, height: 96, borderRadius: 12, backgroundColor: C.surfaceLight },
    secondaryBtn: { borderWidth: 1, borderColor: C.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    secondaryBtnText: { color: C.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
    dangerBtn: { borderWidth: 1, borderColor: C.accentRed, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    dangerBtnText: { color: C.accentRed, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridItem: { width: '47%', gap: 6 },
    gridImage: { width: '100%', aspectRatio: 1, borderRadius: 10, backgroundColor: C.surfaceLight },
    gridActions: { position: 'absolute', top: 6, right: 6, left: 6, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: 4 },
    captionInput: { borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: C.text, fontFamily: 'DMSans_400Regular' },

    addTile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: C.primary, borderRadius: 12, paddingVertical: 14 },
    addTileText: { color: C.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
    emptyState: { color: C.textTertiary, fontFamily: 'DMSans_400Regular', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },

    entryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    entryTitle: { color: C.text, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
    entrySubtitle: { color: C.textSecondary, fontFamily: 'DMSans_400Regular', fontSize: 13, marginTop: 2 },

    field: { marginBottom: 16 },
    label: { fontSize: 13, color: C.textTertiary, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
    fieldError: { color: C.accentRed, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 6, paddingHorizontal: 16 },
    fieldWarning: { color: C.accentOrange, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 6 },
    counter: { color: C.textTertiary, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 6, textAlign: 'right' },

    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
    chipActive: { borderColor: C.primary, backgroundColor: 'rgba(212, 168, 83, 0.12)' },
    chipText: { fontSize: 13, color: C.textSecondary, fontFamily: 'DMSans_500Medium' },
    chipTextActive: { color: C.primary, fontFamily: 'DMSans_600SemiBold' },

    errorBanner: { backgroundColor: 'rgba(255, 59, 48, 0.12)', borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.35)', borderRadius: 12, padding: 14, marginTop: 6, marginBottom: 8 },
    errorBannerText: { color: C.accentRed, fontFamily: 'DMSans_500Medium', fontSize: 14, lineHeight: 20 },
    saveBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
    saveBtnDisabled: { opacity: 0.5 },
    savingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    saveBtnText: { color: C.black, fontFamily: 'DMSans_700Bold', fontSize: 16 },
    draftBtn: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 10 },
    draftBtnText: { color: C.text, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
    requiredHint: { color: C.textTertiary, fontFamily: 'DMSans_400Regular', fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 17 },

    skeletonWrap: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
    skeletonBar: { height: 64, borderRadius: 14, backgroundColor: C.surfaceLight },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: C.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 16, maxHeight: '90%' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: C.text },
    modalInput: { backgroundColor: C.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, fontFamily: 'DMSans_400Regular', borderWidth: 1, borderColor: C.border },
    modalTextArea: { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 },
  });
}
