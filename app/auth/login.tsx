import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';
import { createLogger } from '@/lib/logger';
import Colors from '@/constants/colors';

WebBrowser.maybeCompleteAuthSession();

const log = createLogger('LoginScreen');

function authErrorMessage(code: string | undefined, message: string): string {
  switch (code) {
    case 'invalid_credentials':        return 'Email or password is incorrect.';
    case 'email_not_confirmed':        return 'Please confirm your email address before signing in.';
    case 'user_not_found':             return 'No account found with this email address.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':    return 'Too many attempts. Please wait a moment and try again.';
    case 'user_banned':                return 'This account has been suspended. Contact support.';
    case 'session_not_found':          return 'Your session has expired. Please sign in again.';
    case 'database_querying_schema':   return 'Database not set up yet. Run schema.sql in Supabase first.';
    case 'unexpected_failure':
      if (message.toLowerCase().includes('database')) {
        return 'Database error during sign-in. Auth identity records may be missing.';
      }
      return 'An unexpected error occurred. Please try again.';
    default:                           return message;
  }
}

export default function LoginScreen() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading]   = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    log.info('Google sign-in initiated');
    try {
      // Linking.createURL always resolves to the correct URL for the environment:
      //   native build  → myapp://
      //   Expo Go       → exp://xxx.xxx.xxx.xxx:8081/--/
      //   web (Replit)  → https://<replit-domain>/
      // makeRedirectUri({ scheme }) breaks on web — it returns localhost instead.
      const redirectUrl = Linking.createURL('/');
      log.debug('Google sign-in redirectUrl', { redirectUrl });

      // ── Dev guard ─────────────────────────────────────────────────────────
      // If Google OAuth still lands on localhost after this, open Supabase →
      // Authentication → URL Configuration → Redirect URLs and add the EXACT
      // URL printed below. The IP changes per Wi-Fi network so you may need
      // to re-add it whenever you switch networks. Adding exp://** (wildcard)
      // should also work if Supabase's glob covers non-HTTP schemes.
      if (__DEV__) {
        log.warn('SUPABASE: ensure this URL is in Redirect URLs allowlist', { redirectUrl });
      }
      // ─────────────────────────────────────────────────────────────────────

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL received from Supabase');

      // ── Diagnostic: confirm our redirectUrl is embedded in the OAuth URL ──
      // If hasOurRedirect=false, Supabase rejected it (not in allowed list) and
      // used its Site URL instead. If oauthUrlHasLocalhost=true, that's the bug.
      const oauthUrlHasLocalhost = data.url.includes('localhost');
      const hasOurRedirect = data.url.includes(encodeURIComponent(redirectUrl));
      log.debug('OAuth URL check', {
        oauthUrlHasLocalhost,
        hasOurRedirect,
        // Trim to avoid flooding the console — shows host + first 120 chars of path/query
        oauthUrlPreview: data.url.substring(0, 120),
      });
      // ──────────────────────────────────────────────────────────────────────

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      // ── Diagnostic: full result so we can see type + returned URL ──
      log.debug('WebBrowser result', {
        type: result.type,
        // result.url only exists when type === 'success'
        returnedUrl: result.type === 'success' ? result.url.substring(0, 120) : '(none)',
        returnedUrlHasLocalhost: result.type === 'success' && result.url.includes('localhost'),
      });
      // ───────────────────────────────────────────────────────────────

      if (result.type === 'success') {
        log.debug('Exchanging code for session', { url: result.url.substring(0, 120) });
        const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) {
          log.error('exchangeCodeForSession failed', { code: sessionError.code, message: sessionError.message });
          throw sessionError;
        }
        log.info('Google sign-in successful', { userId: sessionData.user?.id });
        // Navigation is handled automatically by the auth listener in _layout.tsx
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        log.info('Google sign-in cancelled by user', { type: result.type });
      } else {
        // Catch any unexpected result type (e.g. 'locked' on Android)
        log.warn('WebBrowser returned unexpected type', { type: result.type });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      log.error('Google sign-in error', { message });
      Alert.alert('Sign-In Failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    log.info('Apple sign-in initiated');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) throw new Error('No identity token received from Apple');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;
      log.info('Apple sign-in successful');
      router.replace('/(tabs)');
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ERR_REQUEST_CANCELED') return;
      const message = err instanceof Error ? err.message : 'Apple sign-in failed';
      log.error('Apple sign-in error', { message });
      Alert.alert('Sign-In Failed', message);
    } finally {
      setAppleLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    log.info('Email sign-in attempt', { email: trimmedEmail });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        log.error('Email sign-in failed', { code: error.code, message: error.message });
        Alert.alert('Sign-In Failed', authErrorMessage(error.code, error.message));
        return;
      }

      log.info('Email sign-in successful', { userId: data.session?.user.id });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      log.error('Email sign-in exception', { message });
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const anyLoading = loading || googleLoading || appleLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['rgba(212,168,83,0.14)', 'transparent']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={styles.logoRing}>
            <Text style={styles.logoInitial}>C</Text>
          </View>
          <Text style={styles.appName}>CastConnect</Text>
          <Text style={styles.tagline}>The casting marketplace{'\n'}for film professionals</Text>
        </View>

        {/* Auth card */}
        <View style={styles.card}>

          {/* Apple Sign-In — native button, iOS only */}
          {Platform.OS === 'ios' && (
            appleLoading ? (
              <View style={[styles.appleBtn, styles.loadingBox]}>
                <ActivityIndicator color={Colors.black} />
              </View>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={14}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
            )
          )}

          {/* Google Sign-In */}
          <TouchableOpacity
            style={[styles.googleBtn, anyLoading && styles.btnDisabled]}
            onPress={handleGoogleSignIn}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#1F1F1F" />
            ) : (
              <>
                <GoogleGLogo />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email */}
          <TextInput
            style={[styles.input, anyLoading && styles.inputDisabled]}
            placeholder="Email"
            placeholderTextColor={Colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!anyLoading}
          />

          {/* Password */}
          <TextInput
            style={[styles.input, anyLoading && styles.inputDisabled]}
            placeholder="Password"
            placeholderTextColor={Colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!anyLoading}
          />

          {/* Sign-in CTA */}
          <TouchableOpacity
            style={[styles.signInBtn, anyLoading && styles.btnDisabled]}
            onPress={handleEmailSignIn}
            disabled={anyLoading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.black} />
            ) : (
              <Text style={styles.signInBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register */}
          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            style={styles.registerLink}
            disabled={anyLoading}
          >
            <Text style={styles.registerText}>
              Don't have an account?{' '}
              <Text style={styles.registerAccent}>Create one</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Minimal inline Google "G" — avoids any external asset */
function GoogleGLogo() {
  return (
    <View style={gStyles.ring}>
      <Text style={gStyles.letter}>G</Text>
    </View>
  );
}

const gStyles = StyleSheet.create({
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  letter: {
    fontSize: 13,
    fontWeight: '800',
    color: '#4285F4',
    lineHeight: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },

  /* ── Hero ── */
  hero: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 36,
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  logoRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(212,168,83,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  logoInitial: {
    fontSize: 34,
    fontFamily: 'DMSans_700Bold',
    color: Colors.primary,
  },
  appName: {
    fontSize: 26,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  /* ── Card ── */
  card: {
    marginHorizontal: 20,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
  },

  /* Apple */
  appleBtn: {
    height: 52,
    borderRadius: 14,
    marginBottom: 12,
  },
  loadingBox: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Google */
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 3,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: '#1F1F1F',
  },

  /* Divider */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },
  dividerLabel: {
    marginHorizontal: 12,
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textTertiary,
  },

  /* Inputs */
  input: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    marginBottom: 12,
  },
  inputDisabled: {
    opacity: 0.5,
  },

  /* Sign-In CTA */
  signInBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  signInBtnText: {
    color: Colors.black,
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
  },

  /* Register */
  registerLink: {
    marginTop: 22,
    alignItems: 'center',
  },
  registerText: {
    color: Colors.textSecondary,
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
  },
  registerAccent: {
    color: Colors.primary,
    fontFamily: 'DMSans_600SemiBold',
  },

  btnDisabled: { opacity: 0.55 },
});
