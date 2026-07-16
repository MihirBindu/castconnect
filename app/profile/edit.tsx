import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/lib/ThemeContext';
import { ThemeColors } from '@/constants/colors';
import { useAppState } from '@/lib/store';
import { AvailabilityStatus } from '@/lib/types';
import { validateName } from '@/lib/profileValidation';
import { validateBio } from '@/lib/professionalValidation';
import * as Haptics from 'expo-haptics';

const AVAILABILITY_OPTIONS: { key: AvailabilityStatus; label: string; color: string }[] = [
  { key: 'available', label: 'Available', color: '#34C759' },
  { key: 'busy', label: 'Busy', color: '#FF9500' },
  { key: 'not_available', label: 'Not Available', color: '#FF3B30' },
];

function makeStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: C.surfaceLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarTitle: {
      fontSize: 17,
      color: C.text,
      fontFamily: 'DMSans_600SemiBold',
    },
    field: {
      marginBottom: 20,
    },
    label: {
      fontSize: 13,
      color: C.textTertiary,
      fontFamily: 'DMSans_600SemiBold',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
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
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    availOptions: {
      flexDirection: 'row',
      gap: 10,
    },
    availChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
    },
    availDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    availText: {
      fontSize: 13,
      color: C.textSecondary,
      fontFamily: 'DMSans_500Medium',
    },
  });
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const C = useColors();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { myProfile, persistProfile } = useAppState();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const topPadding = insets.top + webTopInset;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(myProfile.name);
  const [title, setTitle] = useState(myProfile.title);
  const [bio, setBio] = useState(myProfile.bio);
  const [location, setLocation] = useState(myProfile.location);
  const [experience, setExperience] = useState(myProfile.experience);
  const [email, setEmail] = useState(myProfile.contactEmail);
  const [phone, setPhone] = useState(myProfile.contactPhone);
  const [availability, setAvailability] = useState(myProfile.availability);
  const [skills, setSkills] = useState(myProfile.skills.join(', '));

  const handleSave = async () => {
    if (saving) return;
    const nameErr = validateName(name); // reuse the onboarding name rules
    if (nameErr) {
      Alert.alert('Invalid name', nameErr);
      return;
    }
    if (!title.trim()) {
      Alert.alert('Required', 'Title is required.');
      return;
    }
    // Bio is the professional-completion field — keep it valid so saving an
    // edit can't regress the user's onboarding status back a step.
    const bioErr = validateBio(bio).error;
    if (bioErr) {
      Alert.alert('Invalid bio', bioErr);
      return;
    }
    setSaving(true);
    const res = await persistProfile({
      name: name.trim(),
      title: title.trim(),
      bio: bio.trim(),
      location: location.trim(),
      experience: experience.trim(),
      contactEmail: email.trim(),
      contactPhone: phone.trim(),
      availability,
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
    });
    setSaving(false);
    if (res.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      // Keep the user's entered values so they can retry.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Could not save', res.message ?? 'Please try again.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={saving} accessibilityRole="button" accessibilityLabel="Save profile">
          {saving ? (
            <ActivityIndicator color={C.primary} />
          ) : (
            <Ionicons name="checkmark" size={26} color={C.primary} />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={C.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Actor & Filmmaker"
            placeholderTextColor={C.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={4}
            placeholderTextColor={C.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholderTextColor={C.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Experience</Text>
          <TextInput
            style={styles.input}
            value={experience}
            onChangeText={setExperience}
            placeholder="e.g. 6 years"
            placeholderTextColor={C.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Skills (comma separated)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={skills}
            onChangeText={setSkills}
            multiline
            placeholder="Acting, Direction, Screenwriting"
            placeholderTextColor={C.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Availability</Text>
          <View style={styles.availOptions}>
            {AVAILABILITY_OPTIONS.map(opt => (
              <Pressable
                key={opt.key}
                onPress={() => {
                  Haptics.selectionAsync();
                  setAvailability(opt.key);
                }}
                style={[
                  styles.availChip,
                  availability === opt.key && { borderColor: opt.color, backgroundColor: `${opt.color}18` },
                ]}
              >
                <View style={[styles.availDot, { backgroundColor: opt.color }]} />
                <Text style={[
                  styles.availText,
                  availability === opt.key && { color: opt.color },
                ]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={C.textTertiary}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholderTextColor={C.textTertiary}
          />
        </View>
      </ScrollView>
    </View>
  );
}
