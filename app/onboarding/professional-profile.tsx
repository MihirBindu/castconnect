import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { useProfileGate } from '@/lib/ProfileGate';
import { getProfile, saveProfessionalProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';
import {
  PROFESSIONAL_ROLE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  WORK_PREFERENCE_OPTIONS,
  AVAILABILITY_STATUS_OPTIONS,
  LANGUAGE_PROFICIENCY_OPTIONS,
  COMMON_LANGUAGES,
  SKILL_SUGGESTIONS,
  ExperienceLevel,
  ProfessionalAvailabilityStatus,
  LanguageProficiency,
  LanguageEntry,
} from '@/lib/types';
import {
  validateRoles,
  validatePrimaryRole,
  validateExperienceLevel,
  validateBio,
  validateYearStarted,
  validateCustomSkill,
  resolvedRoleValues,
  normalizeKey,
  sanitizeBio,
  MAX_ROLES,
  MAX_SKILLS,
  BIO_MIN,
  BIO_MAX,
} from '@/lib/professionalValidation';

const log = createLogger('ProfessionalProfile');
const CURRENT_YEAR = new Date().getFullYear();

export default function ProfessionalProfileScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { session, updateProfile } = useAppState();
  const { setStatus } = useProfileGate();
  const userId = session?.user?.id ?? '';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState('');
  const [roleSearch, setRoleSearch] = useState('');
  const [primaryRole, setPrimaryRole] = useState<string | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [yearStarted, setYearStarted] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [languages, setLanguages] = useState<LanguageEntry[]>([]);
  const [languageInput, setLanguageInput] = useState('');
  const [languageProficiency, setLanguageProficiency] = useState<LanguageProficiency>('Fluent');
  const [workPreferences, setWorkPreferences] = useState<string[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<ProfessionalAvailabilityStatus | null>(null);
  const [showOptional, setShowOptional] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const submittingRef = useRef(false);

  const customRoleRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const markDirty = () => { dirtyRef.current = true; };
  const markTouched = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  // ── Prefill (partial professional profiles keep their data) ───────────────────
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfile(userId);
        if (cancelled || !profile) return;
        // Reconstruct the "Other" selection from saved roles vs custom roles.
        const saved = profile.roles ?? [];
        const customs = profile.customRoles ?? [];
        const predefined = saved.filter((r) => PROFESSIONAL_ROLE_OPTIONS.includes(r as never));
        const hasCustom = saved.some((r) => !PROFESSIONAL_ROLE_OPTIONS.includes(r as never)) || customs.length > 0;
        setSelectedRoles(hasCustom ? [...predefined, 'Other'] : predefined);
        setCustomRole(customs[0] ?? saved.find((r) => !PROFESSIONAL_ROLE_OPTIONS.includes(r as never)) ?? '');
        setPrimaryRole(profile.primaryRole ?? null);
        setExperienceLevel(profile.experienceLevel ?? null);
        setYearStarted(profile.yearStarted != null ? String(profile.yearStarted) : '');
        setBio(profile.bio ?? '');
        setSkills(profile.skills ?? []);
        setLanguages(profile.languages ?? []);
        setWorkPreferences(profile.workPreferences ?? []);
        setAvailabilityStatus(profile.availabilityStatus ?? null);
      } catch (err: unknown) {
        if (cancelled) return;
        log.warn('Prefill failed', { message: err instanceof Error ? err.message : String(err) });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // ── Derived validation ────────────────────────────────────────────────────────
  const resolvedRoles = resolvedRoleValues(selectedRoles, customRole);
  const effectivePrimary = resolvedRoles.length === 1 ? resolvedRoles[0] : primaryRole;
  const rolesError = validateRoles(selectedRoles, customRole);
  const primaryError = validatePrimaryRole(effectivePrimary, resolvedRoles);
  const experienceError = validateExperienceLevel(experienceLevel);
  const bioResult = validateBio(bio);
  const yearResult = validateYearStarted(
    yearStarted.trim() ? parseInt(yearStarted, 10) : null,
    experienceLevel,
    CURRENT_YEAR,
  );
  const isValid =
    !rolesError && !primaryError && !experienceError && !bioResult.error && !yearResult.error;

  const show = (f: string) => submitAttempted || touched[f];

  // ── Actions ───────────────────────────────────────────────────────────────────
  const toggleRole = (role: string) => {
    Haptics.selectionAsync();
    markDirty();
    markTouched('roles');
    setSelectedRoles((prev) => {
      if (prev.includes(role)) {
        const next = prev.filter((r) => r !== role);
        // If the removed role was the primary, clear the primary selection.
        if (primaryRole && normalizeKey(primaryRole) === normalizeKey(role)) setPrimaryRole(null);
        return next;
      }
      if (prev.length >= MAX_ROLES) {
        Alert.alert('Limit reached', `You can select up to ${MAX_ROLES} roles.`);
        return prev;
      }
      return [...prev, role];
    });
  };

  const addSkill = (raw: string) => {
    const v = raw.trim();
    const err = validateCustomSkill(v, skills);
    if (err) { if (v) Alert.alert('Skill', err); return; }
    if (!v) return;
    markDirty();
    setSkills((prev) => [...prev, v]);
    setSkillInput('');
  };

  const addLanguage = () => {
    const name = languageInput.trim();
    if (!name) return;
    if (languages.some((l) => normalizeKey(l.language) === normalizeKey(name))) {
      Alert.alert('Language', 'You have already added that language.');
      return;
    }
    markDirty();
    setLanguages((prev) => [...prev, { language: name, proficiency: languageProficiency }]);
    setLanguageInput('');
  };

  const handleSignOut = async () => {
    log.info('Sign out from professional onboarding');
    await supabase.auth.signOut().catch(() => {});
  };

  const handleBack = () => {
    const goBack = () => router.replace('/onboarding/complete-profile' as never);
    if (dirtyRef.current) {
      Alert.alert('Discard changes?', 'Your professional details on this step will not be saved.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Go Back', style: 'destructive', onPress: goBack },
      ]);
    } else {
      goBack();
    }
  };

  const handleSave = async () => {
    setServerError(null);
    setSubmitAttempted(true);

    if (!isValid) {
      if (rolesError) {
        if (selectedRoles.includes('Other')) customRoleRef.current?.focus();
        else scrollRef.current?.scrollTo({ y: 0, animated: true });
      } else if (primaryError || experienceError) {
        scrollRef.current?.scrollTo({ y: 260, animated: true });
      } else if (yearResult.error) {
        yearRef.current?.focus();
      } else if (bioResult.error) {
        bioRef.current?.focus();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    log.info('Saving professional profile', { userId });

    try {
      const result = await saveProfessionalProfile(userId, {
        roles: resolvedRoles,
        customRoles:
          selectedRoles.includes('Other') && customRole.trim() ? [customRole.trim()] : [],
        primaryRole: effectivePrimary as string,
        experienceLevel: experienceLevel as ExperienceLevel,
        yearStarted: yearStarted.trim() ? parseInt(yearStarted, 10) : null,
        bio: sanitizeBio(bio),
        skills,
        languages,
        workPreferences,
        availabilityStatus,
      });

      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const p = result.profile;
        updateProfile({
          roles: p.roles,
          customRoles: p.customRoles,
          primaryRole: p.primaryRole,
          experienceLevel: p.experienceLevel,
          yearStarted: p.yearStarted,
          bio: p.bio,
          skills: p.skills,
          languages: p.languages,
          workPreferences: p.workPreferences,
          availabilityStatus: p.availabilityStatus,
          professionalProfileCompleted: p.professionalProfileCompleted,
          onboardingStatus: p.onboardingStatus,
          updatedAt: p.updatedAt,
        });
        dirtyRef.current = false;
        setStatus(p.onboardingStatus ?? 'COMPLETED');
        router.replace('/(tabs)');
        return;
      }

      log.warn('Professional save failed', { error: result.error });
      setServerError(result.message);
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
          {[220, 120, 180, 120, 200, 90].map((w, i) => (
            <View key={i} style={[styles.skeletonBar, { width: w }]} />
          ))}
        </View>
      </View>
    );
  }

  const filteredRoles = PROFESSIONAL_ROLE_OPTIONS.filter((r) =>
    r.toLowerCase().includes(roleSearch.trim().toLowerCase()),
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Back to personal profile"
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={22} color={C.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.stepText}>Step 2 of 3</Text>
        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          hitSlop={8}
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Professional Profile</Text>
        <Text style={styles.subtitle}>
          Tell casting professionals what you do and the work you’re looking for.
        </Text>

        {/* Roles */}
        <Field styles={styles} label="I am a" required error={show('roles') ? rolesError : null}>
          <TextInput
            style={styles.search}
            value={roleSearch}
            onChangeText={setRoleSearch}
            placeholder="Search roles…"
            placeholderTextColor={C.textTertiary}
            autoCapitalize="none"
            accessibilityLabel="Search professional roles"
          />
          <View style={styles.chipsWrap}>
            {filteredRoles.map((role) => (
              <Chip
                styles={styles}
                key={role}
                label={role}
                selected={selectedRoles.includes(role)}
                onPress={() => toggleRole(role)}
              />
            ))}
            {filteredRoles.length === 0 && <Text style={styles.helpText}>No roles match “{roleSearch}”.</Text>}
          </View>

          {selectedRoles.includes('Other') && (
            <TextInput
              ref={customRoleRef}
              style={[styles.input, styles.customInput, show('roles') && rolesError && styles.inputError]}
              value={customRole}
              onChangeText={(t) => { markDirty(); setCustomRole(t); }}
              onBlur={() => markTouched('roles')}
              placeholder="Enter your professional role"
              placeholderTextColor={C.textTertiary}
              maxLength={50}
              editable={!saving}
              accessibilityLabel="Enter your professional role, required"
            />
          )}

          {resolvedRoles.length > 0 && (
            <View style={[styles.chipsWrap, { marginTop: 12 }]}>
              {resolvedRoles.map((role) => (
                <View key={role} style={styles.removableChip}>
                  <Text style={styles.removableChipText}>{role}</Text>
                  <Pressable
                    onPress={() => {
                      // Remove: predefined toggles off; custom clears the "Other" text.
                      if (PROFESSIONAL_ROLE_OPTIONS.includes(role as never)) toggleRole(role);
                      else { markDirty(); setCustomRole(''); }
                    }}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${role}`}
                  >
                    <Ionicons name="close-circle" size={16} color={C.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Text style={styles.helpText}>Select all that apply (up to {MAX_ROLES}).</Text>
        </Field>

        {/* Primary profession — only when more than one role */}
        {resolvedRoles.length > 1 && (
          <Field styles={styles} label="Primary Profession" required error={show('primary') ? primaryError : null}>
            <View style={styles.chipsWrap}>
              {resolvedRoles.map((role) => (
                <Chip
                  styles={styles}
                  key={role}
                  label={role}
                  selected={!!primaryRole && normalizeKey(primaryRole) === normalizeKey(role)}
                  onPress={() => { Haptics.selectionAsync(); markTouched('primary'); setPrimaryRole(role); }}
                />
              ))}
            </View>
            <Text style={styles.helpText}>Shown as your main role on your profile and in search.</Text>
          </Field>
        )}

        {/* Experience */}
        <Field styles={styles} label="Professional Experience" required error={show('experience') ? experienceError : null}>
          <View style={styles.chipsWrap}>
            {EXPERIENCE_LEVEL_OPTIONS.map((lvl) => (
              <Chip
                styles={styles}
                key={lvl}
                label={lvl}
                selected={experienceLevel === lvl}
                onPress={() => { Haptics.selectionAsync(); markDirty(); markTouched('experience'); setExperienceLevel(lvl); }}
              />
            ))}
          </View>
        </Field>

        {/* Year started (optional) */}
        <Field
          styles={styles}
          label="Year Started"
          error={show('year') ? yearResult.error : null}
          warning={show('year') ? yearResult.warning : null}
        >
          <TextInput
            ref={yearRef}
            style={[styles.input, show('year') && yearResult.error && styles.inputError]}
            value={yearStarted}
            onChangeText={(t) => { markDirty(); setYearStarted(t.replace(/[^0-9]/g, '')); }}
            onBlur={() => markTouched('year')}
            placeholder={`e.g. ${CURRENT_YEAR - 3} (optional)`}
            placeholderTextColor={C.textTertiary}
            keyboardType="number-pad"
            maxLength={4}
            editable={!saving}
            accessibilityLabel="Year started, optional"
          />
        </Field>

        {/* Bio */}
        <Field
          styles={styles}
          label="Bio"
          required
          error={show('bio') ? bioResult.error : null}
          warning={show('bio') ? bioResult.warning : null}
        >
          <Text style={styles.helpText}>
            Tell people about your professional background, skills, interests, and the type of
            opportunities you’re looking for.
          </Text>
          <TextInput
            ref={bioRef}
            style={[styles.input, styles.textArea, show('bio') && bioResult.error && styles.inputError]}
            value={bio}
            onChangeText={(t) => { markDirty(); setBio(t.slice(0, BIO_MAX)); }}
            onBlur={() => markTouched('bio')}
            placeholder="Actor and theatre artist with three years of experience in stage performances, short films, and digital advertisements. Interested in lead, supporting, and character-driven roles."
            placeholderTextColor={C.textTertiary}
            multiline
            maxLength={BIO_MAX}
            editable={!saving}
            accessibilityLabel="Bio, required"
          />
          <Text style={[styles.counter, bio.trim().length < BIO_MIN && styles.counterWarn]}>
            {bio.trim().length}/{BIO_MAX} (min {BIO_MIN})
          </Text>
        </Field>

        {/* Optional details */}
        <Pressable
          onPress={() => { Haptics.selectionAsync(); setShowOptional((s) => !s); }}
          accessibilityRole="button"
          accessibilityState={{ expanded: showOptional }}
          style={styles.expandRow}
        >
          <Text style={styles.expandText}>Add More Professional Details</Text>
          <Ionicons name={showOptional ? 'chevron-up' : 'chevron-down'} size={18} color={C.primary} />
        </Pressable>

        {showOptional && (
          <View>
            {/* Skills */}
            <Field styles={styles} label="Skills">
              <View style={styles.rowInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={skillInput}
                  onChangeText={setSkillInput}
                  onSubmitEditing={() => addSkill(skillInput)}
                  placeholder="Add a skill"
                  placeholderTextColor={C.textTertiary}
                  maxLength={40}
                  editable={!saving}
                  returnKeyType="done"
                  accessibilityLabel="Add a skill"
                />
                <Pressable onPress={() => addSkill(skillInput)} style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add skill">
                  <Ionicons name="add" size={20} color={C.black} />
                </Pressable>
              </View>
              <View style={styles.chipsWrap}>
                {SKILL_SUGGESTIONS.filter((s) => !skills.some((x) => normalizeKey(x) === normalizeKey(s))).map((s) => (
                  <Chip styles={styles} key={s} label={`+ ${s}`} selected={false} onPress={() => addSkill(s)} />
                ))}
              </View>
              {skills.length > 0 && (
                <View style={[styles.chipsWrap, { marginTop: 10 }]}>
                  {skills.map((s) => (
                    <View key={s} style={styles.removableChip}>
                      <Text style={styles.removableChipText}>{s}</Text>
                      <Pressable onPress={() => { markDirty(); setSkills((prev) => prev.filter((x) => x !== s)); }} hitSlop={6} accessibilityLabel={`Remove ${s}`}>
                        <Ionicons name="close-circle" size={16} color={C.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.helpText}>Up to {MAX_SKILLS} skills.</Text>
            </Field>

            {/* Languages */}
            <Field styles={styles} label="Languages Known">
              <View style={styles.rowInput}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={languageInput}
                  onChangeText={setLanguageInput}
                  placeholder="Language"
                  placeholderTextColor={C.textTertiary}
                  maxLength={40}
                  editable={!saving}
                  accessibilityLabel="Language name"
                />
                <Pressable onPress={addLanguage} style={styles.addBtn} accessibilityRole="button" accessibilityLabel="Add language">
                  <Ionicons name="add" size={20} color={C.black} />
                </Pressable>
              </View>
              <View style={styles.chipsWrap}>
                {LANGUAGE_PROFICIENCY_OPTIONS.map((p) => (
                  <Chip styles={styles} key={p} label={p} selected={languageProficiency === p} onPress={() => setLanguageProficiency(p)} />
                ))}
              </View>
              <View style={styles.chipsWrap}>
                {COMMON_LANGUAGES.filter((l) => !languages.some((x) => normalizeKey(x.language) === normalizeKey(l))).slice(0, 8).map((l) => (
                  <Chip styles={styles} key={l} label={`+ ${l}`} selected={false} onPress={() => { markDirty(); setLanguages((prev) => [...prev, { language: l, proficiency: languageProficiency }]); }} />
                ))}
              </View>
              {languages.length > 0 && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  {languages.map((l) => (
                    <View key={l.language} style={styles.langRow}>
                      <Text style={styles.langText}>{l.language} · {l.proficiency}</Text>
                      <Pressable onPress={() => { markDirty(); setLanguages((prev) => prev.filter((x) => x.language !== l.language)); }} hitSlop={6} accessibilityLabel={`Remove ${l.language}`}>
                        <Ionicons name="close-circle" size={18} color={C.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </Field>

            {/* Work preferences */}
            <Field styles={styles} label="Work Preferences">
              <View style={styles.chipsWrap}>
                {WORK_PREFERENCE_OPTIONS.map((w) => (
                  <Chip
                    styles={styles}
                    key={w}
                    label={w}
                    selected={workPreferences.includes(w)}
                    onPress={() => {
                      Haptics.selectionAsync();
                      markDirty();
                      setWorkPreferences((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
                    }}
                  />
                ))}
              </View>
            </Field>

            {/* Availability status */}
            <Field styles={styles} label="Current Professional Status">
              <View style={styles.chipsWrap}>
                {AVAILABILITY_STATUS_OPTIONS.map((a) => (
                  <Chip
                    styles={styles}
                    key={a}
                    label={a}
                    selected={availabilityStatus === a}
                    onPress={() => { Haptics.selectionAsync(); markDirty(); setAvailabilityStatus(a); }}
                  />
                ))}
              </View>
            </Field>
          </View>
        )}

        {serverError && (
          <View style={styles.errorBanner} accessibilityLiveRegion="polite">
            <Text style={styles.errorBannerText}>{serverError}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={!isValid || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isValid || saving }}
          accessibilityLabel="Save and continue"
          style={[styles.saveBtn, (!isValid || saving) && styles.saveBtnDisabled]}
        >
          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color={C.black} />
              <Text style={styles.saveBtnText}>Saving Professional Profile…</Text>
            </View>
          ) : (
            <Text style={styles.saveBtnText}>Save and Continue</Text>
          )}
        </Pressable>

        <Text style={styles.requiredHint}>* Required fields</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Presentational helpers ──────────────────────────────────────────────────────
function Field({
  styles,
  label,
  required,
  error,
  warning,
  children,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  required?: boolean;
  error?: string | null;
  warning?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.asterisk}> *</Text>}
      </Text>
      {children}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
      {!error && !!warning && <Text style={styles.fieldWarning}>{warning}</Text>}
    </View>
  );
}

function Chip({
  styles,
  label,
  selected,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected && styles.chipActive]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    backText: { color: C.text, fontFamily: 'DMSans_500Medium', fontSize: 15 },
    stepText: { color: C.textSecondary, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
    signOutBtn: { paddingVertical: 6, paddingHorizontal: 8 },
    signOutText: { color: C.textSecondary, fontFamily: 'DMSans_600SemiBold', fontSize: 14 },
    progressTrack: {
      height: 4,
      backgroundColor: C.surfaceLight,
      marginHorizontal: 20,
      borderRadius: 2,
      overflow: 'hidden',
      marginBottom: 4,
    },
    progressFill: { width: '66%', height: '100%', backgroundColor: C.primary },
    scroll: {
      paddingHorizontal: 20,
      paddingBottom: 60,
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    title: { fontSize: 26, fontFamily: 'DMSans_700Bold', color: C.text, marginTop: 8, letterSpacing: -0.4 },
    subtitle: { fontSize: 15, fontFamily: 'DMSans_400Regular', color: C.textSecondary, lineHeight: 22, marginTop: 8, marginBottom: 24 },
    field: { marginBottom: 22 },
    label: {
      fontSize: 13,
      color: C.textTertiary,
      fontFamily: 'DMSans_600SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    asterisk: { color: C.primary },
    input: {
      backgroundColor: C.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: C.text,
      fontFamily: 'DMSans_400Regular',
      borderWidth: 1,
      borderColor: C.border,
    },
    customInput: { marginTop: 12 },
    search: {
      backgroundColor: C.surfaceLight,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: C.text,
      fontFamily: 'DMSans_400Regular',
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 12,
    },
    textArea: { minHeight: 130, textAlignVertical: 'top', paddingTop: 14 },
    inputError: { borderColor: C.accentRed },
    fieldError: { color: C.accentRed, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 6 },
    fieldWarning: { color: C.accentOrange, fontFamily: 'DMSans_500Medium', fontSize: 13, marginTop: 6 },
    helpText: { color: C.textTertiary, fontFamily: 'DMSans_400Regular', fontSize: 12, marginTop: 8, lineHeight: 17 },
    counter: { color: C.textTertiary, fontFamily: 'DMSans_500Medium', fontSize: 12, marginTop: 6, textAlign: 'right' },
    counterWarn: { color: C.accentOrange },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    chipActive: { borderColor: C.primary, backgroundColor: 'rgba(212, 168, 83, 0.12)' },
    chipText: { fontSize: 14, color: C.textSecondary, fontFamily: 'DMSans_500Medium' },
    chipTextActive: { color: C.primary, fontFamily: 'DMSans_600SemiBold' },
    removableChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: 'rgba(212, 168, 83, 0.12)',
      borderWidth: 1,
      borderColor: C.primary,
    },
    removableChipText: { color: C.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 13 },
    rowInput: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    addBtn: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    langRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
    },
    langText: { color: C.text, fontFamily: 'DMSans_500Medium', fontSize: 14 },
    expandRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      marginBottom: 22,
    },
    expandText: { color: C.primary, fontFamily: 'DMSans_600SemiBold', fontSize: 15 },
    errorBanner: {
      backgroundColor: 'rgba(255, 59, 48, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 59, 48, 0.35)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    errorBannerText: { color: C.accentRed, fontFamily: 'DMSans_500Medium', fontSize: 14, lineHeight: 20 },
    saveBtn: {
      backgroundColor: C.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
      shadowColor: C.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.28,
      shadowRadius: 10,
      elevation: 5,
    },
    saveBtnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
    savingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    saveBtnText: { color: C.black, fontFamily: 'DMSans_700Bold', fontSize: 16 },
    requiredHint: { color: C.textTertiary, fontFamily: 'DMSans_400Regular', fontSize: 12, textAlign: 'center', marginTop: 14 },
    skeletonWrap: { paddingHorizontal: 20, paddingTop: 24, gap: 16 },
    skeletonBar: { height: 46, borderRadius: 12, backgroundColor: C.surfaceLight },
  });
}
