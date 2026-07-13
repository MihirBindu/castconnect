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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { useProfileGate } from '@/lib/ProfileGate';
import { getProfile, completeProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';
import {
  BODY_TYPE_OPTIONS,
  COMPLEXION_OPTIONS,
  BodyType,
  Complexion,
  HeightUnit,
} from '@/lib/types';
import {
  validateName,
  validateAge,
  parseAge,
  validateHeightFeet,
  validateHeightCm,
  validateBodyType,
  validateComplexion,
  cmToFeetInches,
} from '@/lib/profileValidation';

const log = createLogger('CompleteProfile');

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { session, updateProfile } = useAppState();
  const { setStatus } = useProfileGate();

  const userId = session?.user?.id ?? '';
  const email = session?.user?.email ?? '';
  const authProvider = (session?.user?.app_metadata?.provider as string) ?? 'email';
  const googleName =
    (session?.user?.user_metadata?.full_name as string) ||
    (session?.user?.user_metadata?.name as string) ||
    '';

  // ── Form state ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [unit, setUnit] = useState<HeightUnit>('ft');
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [cm, setCm] = useState('');
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  const [customBodyType, setCustomBodyType] = useState('');
  const [complexion, setComplexion] = useState<Complexion | null>(null);
  const [customComplexion, setCustomComplexion] = useState('');

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const nameRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const feetRef = useRef<TextInput>(null);
  const cmRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ── Prefill from any saved profile (partial profiles keep their data) ─────────
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const profile = await getProfile(userId);
        if (cancelled) return;
        // Never overwrite a real saved name with empty Google data.
        setFullName(profile?.name?.trim() || googleName || '');
        if (profile?.age != null) setAge(String(profile.age));
        if (profile?.heightCm != null) {
          setUnit('cm');
          setCm(String(profile.heightCm));
          const { feet: f, inches: i } = cmToFeetInches(profile.heightCm);
          setFeet(String(f));
          setInches(String(i));
        }
        if (profile?.bodyType) setBodyType(profile.bodyType);
        if (profile?.customBodyType) setCustomBodyType(profile.customBodyType);
        if (profile?.complexion) setComplexion(profile.complexion);
        if (profile?.customComplexion) setCustomComplexion(profile.customComplexion);
      } catch (err: unknown) {
        // Network/other failure loading the profile — fall back to Google name
        // and let the user fill the rest rather than blocking onboarding.
        if (cancelled) return;
        log.warn('Prefill failed, using fallback', {
          message: err instanceof Error ? err.message : String(err),
        });
        setFullName(googleName || '');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── Derived validation ────────────────────────────────────────────────────────
  const heightResult = unit === 'ft' ? validateHeightFeet(feet, inches) : validateHeightCm(cm);
  const nameError = validateName(fullName);
  const ageError = validateAge(age);
  const heightError = heightResult.error;
  const bodyError = validateBodyType(bodyType);
  const complexionError = validateComplexion(complexion);
  const isFormValid = !nameError && !ageError && !heightError && !bodyError && !complexionError;

  const show = (field: string) => submitAttempted || touched[field];
  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  const handleSignOut = async () => {
    log.info('Sign out from onboarding');
    await supabase.auth.signOut().catch(() => {});
    // Root gate redirects to /auth/login once the session clears.
  };

  const handleSave = async () => {
    setServerError(null);
    setSubmitAttempted(true);

    if (!isFormValid) {
      // Focus / scroll to the first invalid field.
      if (nameError) nameRef.current?.focus();
      else if (ageError) ageRef.current?.focus();
      else if (heightError) (unit === 'ft' ? feetRef : cmRef).current?.focus();
      else scrollRef.current?.scrollToEnd({ animated: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    // Prevent duplicate submissions.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    log.info('Saving onboarding profile', { userId });

    try {
      const result = await completeProfile(userId, {
        fullName,
        age: parseAge(age) as number,
        heightCm: heightResult.cm as number,
        bodyType: bodyType as BodyType,
        customBodyType,
        complexion: complexion as Complexion,
        customComplexion,
        email,
        authProvider,
      });

      if (result.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Sync the onboarding fields into the dashboard's profile without
        // clobbering fields loaded elsewhere (e.g. connections).
        const p = result.profile;
        updateProfile({
          name: p.name,
          contactEmail: p.contactEmail,
          age: p.age,
          heightCm: p.heightCm,
          bodyType: p.bodyType,
          customBodyType: p.customBodyType,
          complexion: p.complexion,
          customComplexion: p.customComplexion,
          authProvider: p.authProvider,
          profileCompleted: p.profileCompleted,
          updatedAt: p.updatedAt,
          onboardingStatus: p.onboardingStatus,
        });
        // Personal step done → advance to the professional step (step 2).
        setStatus(p.onboardingStatus ?? 'PROFESSIONAL_PROFILE_PENDING');
        router.replace('/onboarding/professional-profile' as never);
        return;
      }

      // Failure — keep every entered value and surface a clear message.
      log.warn('Save failed', { error: result.error });
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
      <View style={[styles.container, styles.center, { paddingTop: topPadding }]}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={styles.loadingText}>Loading your profile…</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.topBar, { paddingTop: topPadding }]}>
        <Text style={styles.stepText}>Step 1 of 3</Text>
        <View style={styles.topBarSpacer} />
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

      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Please Complete Your Profile</Text>
        <Text style={styles.subtitle}>
          Tell us a bit about yourself to finish setting up your CastConnect account.
        </Text>

        {/* Full Name */}
        <Field label="Full Name" required error={show('name') ? nameError : null}>
          <TextInput
            ref={nameRef}
            style={[styles.input, show('name') && nameError && styles.inputError]}
            value={fullName}
            onChangeText={setFullName}
            onBlur={() => markTouched('name')}
            placeholder="e.g. Priya Sharma"
            placeholderTextColor={C.textTertiary}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={100}
            editable={!saving}
            returnKeyType="next"
            accessibilityLabel="Full name, required"
          />
        </Field>

        {/* Age */}
        <Field label="Age" required error={show('age') ? ageError : null}>
          <TextInput
            ref={ageRef}
            style={[styles.input, show('age') && ageError && styles.inputError]}
            value={age}
            onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
            onBlur={() => markTouched('age')}
            placeholder="e.g. 27"
            placeholderTextColor={C.textTertiary}
            keyboardType="number-pad"
            maxLength={3}
            editable={!saving}
            accessibilityLabel="Age, required"
          />
        </Field>

        {/* Height */}
        <Field label="Height" required error={show('height') ? heightError : null}>
          <View style={styles.unitRow}>
            {(['ft', 'cm'] as HeightUnit[]).map((u) => {
              const active = unit === u;
              return (
                <Pressable
                  key={u}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setUnit(u);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={u === 'ft' ? 'Feet and inches' : 'Centimetres'}
                  style={[styles.unitChip, active && styles.unitChipActive]}
                >
                  <Text style={[styles.unitChipText, active && styles.unitChipTextActive]}>
                    {u === 'ft' ? 'Feet / Inches' : 'Centimetres'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {unit === 'ft' ? (
            <View style={styles.heightRow}>
              <View style={styles.heightCol}>
                <TextInput
                  ref={feetRef}
                  style={[styles.input, show('height') && heightError && styles.inputError]}
                  value={feet}
                  onChangeText={(t) => setFeet(t.replace(/[^0-9]/g, ''))}
                  onBlur={() => markTouched('height')}
                  placeholder="Feet (3–8)"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="number-pad"
                  maxLength={1}
                  editable={!saving}
                  accessibilityLabel="Height in feet, required"
                />
              </View>
              <View style={styles.heightCol}>
                <TextInput
                  style={[styles.input, show('height') && heightError && styles.inputError]}
                  value={inches}
                  onChangeText={(t) => setInches(t.replace(/[^0-9]/g, ''))}
                  onBlur={() => markTouched('height')}
                  placeholder="Inches (0–11)"
                  placeholderTextColor={C.textTertiary}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!saving}
                  accessibilityLabel="Height in inches, required"
                />
              </View>
            </View>
          ) : (
            <TextInput
              ref={cmRef}
              style={[styles.input, show('height') && heightError && styles.inputError]}
              value={cm}
              onChangeText={(t) => setCm(t.replace(/[^0-9]/g, ''))}
              onBlur={() => markTouched('height')}
              placeholder="Centimetres (90–250)"
              placeholderTextColor={C.textTertiary}
              keyboardType="number-pad"
              maxLength={3}
              editable={!saving}
              accessibilityLabel="Height in centimetres, required"
            />
          )}
        </Field>

        {/* Body Type */}
        <Field label="Body Type" required error={show('bodyType') ? bodyError : null}>
          <View style={styles.chipsWrap}>
            {BODY_TYPE_OPTIONS.map((opt) => (
              <SelectChip
                key={opt}
                C={C}
                label={opt}
                selected={bodyType === opt}
                onPress={() => {
                  Haptics.selectionAsync();
                  markTouched('bodyType');
                  setBodyType(opt);
                }}
              />
            ))}
          </View>
          {bodyType === 'Other' && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={customBodyType}
              onChangeText={setCustomBodyType}
              placeholder="Describe your body type (optional)"
              placeholderTextColor={C.textTertiary}
              maxLength={60}
              editable={!saving}
              accessibilityLabel="Custom body type, optional"
            />
          )}
        </Field>

        {/* Complexion */}
        <Field label="Complexion" required error={show('complexion') ? complexionError : null}>
          <View style={styles.chipsWrap}>
            {COMPLEXION_OPTIONS.map((opt) => (
              <SelectChip
                key={opt}
                C={C}
                label={opt}
                selected={complexion === opt}
                onPress={() => {
                  Haptics.selectionAsync();
                  markTouched('complexion');
                  setComplexion(opt);
                }}
              />
            ))}
          </View>
          {complexion === 'Other' && (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={customComplexion}
              onChangeText={setCustomComplexion}
              placeholder="Describe your complexion (optional)"
              placeholderTextColor={C.textTertiary}
              maxLength={60}
              editable={!saving}
              accessibilityLabel="Custom complexion, optional"
            />
          )}
        </Field>

        {serverError && (
          <View style={styles.errorBanner} accessibilityLiveRegion="polite">
            <Text style={styles.errorBannerText}>{serverError}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSave}
          disabled={!isFormValid || saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: !isFormValid || saving }}
          accessibilityLabel="Save and continue"
          style={[styles.saveBtn, (!isFormValid || saving) && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator color={C.black} />
          ) : (
            <Text style={styles.saveBtnText}>Save and Continue</Text>
          )}
        </Pressable>

        <Text style={styles.requiredHint}>* All fields are required</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Small presentational helpers ────────────────────────────────────────────────
function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.asterisk}> *</Text>}
      </Text>
      {children}
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function SelectChip({
  C,
  label,
  selected,
  onPress,
}: {
  C: ThemeColors;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useMemo(() => makeStyles(C), [C]);
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
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
    },
    loadingText: {
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
      fontSize: 15,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    topBarSpacer: { flex: 1 },
    stepText: {
      color: C.textSecondary,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 13,
    },
    signOutBtn: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    signOutText: {
      color: C.textSecondary,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 14,
    },
    scroll: {
      paddingHorizontal: 20,
      paddingBottom: 60,
      maxWidth: 560,
      width: '100%',
      alignSelf: 'center',
    },
    title: {
      fontSize: 26,
      fontFamily: 'DMSans_700Bold',
      color: C.text,
      marginTop: 8,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 15,
      fontFamily: 'DMSans_400Regular',
      color: C.textSecondary,
      lineHeight: 22,
      marginTop: 8,
      marginBottom: 28,
    },
    field: {
      marginBottom: 22,
    },
    label: {
      fontSize: 13,
      color: C.textTertiary,
      fontFamily: 'DMSans_600SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    asterisk: {
      color: C.primary,
    },
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
    inputError: {
      borderColor: C.accentRed,
    },
    fieldError: {
      color: C.accentRed,
      fontFamily: 'DMSans_500Medium',
      fontSize: 13,
      marginTop: 6,
    },
    unitRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    unitChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      alignItems: 'center',
    },
    unitChipActive: {
      borderColor: C.primary,
      backgroundColor: 'rgba(212, 168, 83, 0.10)',
    },
    unitChipText: {
      fontSize: 14,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    unitChipTextActive: {
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
    heightRow: {
      flexDirection: 'row',
      gap: 10,
    },
    heightCol: {
      flex: 1,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    chipActive: {
      borderColor: C.primary,
      backgroundColor: 'rgba(212, 168, 83, 0.12)',
    },
    chipText: {
      fontSize: 14,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
    chipTextActive: {
      color: C.primary,
      fontFamily: 'DMSans_600SemiBold',
    },
    errorBanner: {
      backgroundColor: 'rgba(255, 59, 48, 0.12)',
      borderWidth: 1,
      borderColor: 'rgba(255, 59, 48, 0.35)',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    errorBannerText: {
      color: C.accentRed,
      fontFamily: 'DMSans_500Medium',
      fontSize: 14,
      lineHeight: 20,
    },
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
    saveBtnDisabled: {
      opacity: 0.45,
      shadowOpacity: 0,
      elevation: 0,
    },
    saveBtnText: {
      color: C.black,
      fontFamily: 'DMSans_700Bold',
      fontSize: 16,
    },
    requiredHint: {
      color: C.textTertiary,
      fontFamily: 'DMSans_400Regular',
      fontSize: 12,
      textAlign: 'center',
      marginTop: 14,
    },
  });
}
