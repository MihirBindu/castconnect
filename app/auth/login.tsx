import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';
import Colors from '@/constants/colors';

const log = createLogger('LoginScreen');

function authErrorMessage(code: string | undefined, message: string): string {
  switch (code) {
    case 'invalid_credentials':      return 'Email or password is incorrect.';
    case 'email_not_confirmed':      return 'Please confirm your email address before signing in.';
    case 'user_not_found':           return 'No account found with this email address.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':  return 'Too many attempts. Please wait a moment and try again.';
    case 'user_banned':              return 'This account has been suspended. Contact support.';
    case 'session_not_found':        return 'Your session has expired. Please sign in again.';
    case 'database_querying_schema': return 'Database not set up yet. Run schema.sql in Supabase first.';
    case 'unexpected_failure':
      if (message.toLowerCase().includes('database')) {
        return 'Database error during sign-in. Auth identity records may be missing — run the identities fix SQL in Supabase.';
      }
      return 'An unexpected error occurred. Please try again.';
    default:                         return message;
  }
}

function isNetworkError(message: string): boolean {
  return (
    message.includes('Network request failed') ||
    message.includes('fetch failed') ||
    message.includes('Failed to fetch')
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    log.info('Login attempt', { email: trimmedEmail });
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        log.error('Login failed', { code: error.code, message: error.message });
        const message = isNetworkError(error.message)
          ? 'Connection failed. Check your internet connection and try again.'
          : authErrorMessage(error.code, error.message);
        Alert.alert('Login Failed', message);
        return;
      }

      log.info('Login successful', { userId: data.session?.user.id });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      log.error('Login exception', { message });
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
      <View style={styles.inner}>
        <Text style={styles.logo}>CastConnect</Text>
        <Text style={styles.tagline}>The casting marketplace for film professionals</Text>

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
          placeholder="Password"
          placeholderTextColor={Colors.textTertiary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          editable={!loading}
        />

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.black} />
          ) : (
            <Text style={styles.btnText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/auth/register')} style={styles.link} disabled={loading}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkAccent}>Register</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
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
