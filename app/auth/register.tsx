import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';
import Colors from '@/constants/colors';

const log = createLogger('RegisterScreen');

function registerErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'user_already_exists':
    case 'email_exists':             return 'An account with this email already exists. Try signing in.';
    case 'weak_password':            return 'Password is too weak. Use at least 8 characters with letters and numbers.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':  return 'Too many sign-up attempts. Please wait a moment and try again.';
    case 'invalid_email':            return 'Please enter a valid email address.';
    case 'database_querying_schema': return 'Database not set up yet. Run schema.sql in Supabase first.';
    default:                         return fallback;
  }
}

function isNetworkError(message: string): boolean {
  return (
    message.includes('Network request failed') ||
    message.includes('fetch failed') ||
    message.includes('Failed to fetch')
  );
}

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    log.info('Register attempt', { email: trimmedEmail });
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: { data: { name: trimmedName } },
      });

      if (error) {
        log.error('Registration failed', { code: error.code, message: error.message });
        const message = isNetworkError(error.message)
          ? 'Connection failed. Check your internet connection and try again.'
          : registerErrorMessage(error.code, error.message);
        Alert.alert('Registration Failed', message);
        return;
      }

      // Supabase returns a session immediately if email confirmation is disabled.
      // The root layout's profile-completion gate then routes the new user to
      // onboarding once the session updates.
      if (data.session) {
        log.info('Registration successful (auto-confirmed)', { userId: data.user?.id });
      } else {
        log.info('Registration successful (confirmation required)', { userId: data.user?.id });
        Alert.alert(
          'Check your email',
          'We sent a confirmation link to your email. Please verify before signing in.',
          [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      log.error('Registration exception', { message });
      if (isNetworkError(message)) {
        Alert.alert('No connection', 'Check your internet connection and try again.');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>CastConnect</Text>
        <Text style={styles.tagline}>Create your professional profile</Text>

        <TextInput
          style={styles.input}
          placeholder="Full Name"
          placeholderTextColor={Colors.textTertiary}
          value={name}
          onChangeText={setName}
          autoComplete="name"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 6 characters)"
          placeholderTextColor={Colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!loading}
        />

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <Text style={styles.btnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/login')} style={styles.link} disabled={loading}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkAccent}>Sign In</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48 },
  logo: {
    fontSize: 32, fontFamily: 'DMSans_700Bold',
    color: Colors.primary, textAlign: 'center', marginBottom: 8,
  },
  tagline: {
    fontSize: 14, fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary, textAlign: 'center', marginBottom: 40,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    color: Colors.text, fontFamily: 'DMSans_400Regular', fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.black, fontFamily: 'DMSans_700Bold', fontSize: 16 },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: Colors.textSecondary, fontFamily: 'DMSans_400Regular', fontSize: 14 },
  linkAccent: { color: Colors.primary, fontFamily: 'DMSans_600SemiBold' },
});
