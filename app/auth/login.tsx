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

    // ── Redirect URL strategy ────────────────────────────────────────────────
    // We need a URL that satisfies ALL THREE of:
    //   1. Supabase allows it in the redirect URL allowlist
    //   2. Chrome Custom Tab can fire an Android intent for it
    //   3. RedirectUriReceiverActivity (expo-web-browser) can intercept it
    //
    // exp://IP:PORT/--/ fails condition 1 and 3:
    //   - Supabase's allowlist URL parser splits exp://** into scheme=exp,
    //     host=**, path="" — empty path doesn't match /--/, so validation fails
    //     and Supabase falls back to Site URL (localhost:3000).
    //   - Even if it reached Chrome, RedirectUriReceiverActivity's intent-filter
    //     only lists "myapp://" (from app.json scheme), never "exp://".
    //
    // myapp:// satisfies all three:
    //   1. Already in Supabase allowlist ✅
    //   2. Chrome fires android.intent.action.VIEW for myapp:// ✅
    //   3. RedirectUriReceiverActivity has myapp:// in its intent-filter ✅
    //
    // On web (Platform.OS === 'web'), Linking.createURL returns the Replit
    // HTTPS URL which matches https://*.replit.dev/** in the allowlist.
    // ─────────────────────────────────────────────────────────────────────────
    const redirectUrl = Platform.OS === 'web' ? Linking.createURL('/') : 'myapp://';
    log.debug('Google sign-in redirectUrl', { redirectUrl, platform: Platform.OS });

    // Shared flag so only one path calls exchangeCodeForSession
    let sessionResolved = false;
    let linkSub: ReturnType<typeof Linking.addEventListener> | null = null;

    const exchangeCode = async (url: string, source: 'deep-link' | 'web-browser') => {
      if (sessionResolved) return;
      sessionResolved = true;
      linkSub?.remove();

      log.debug('Exchanging code for session', { source, url: url.substring(0, 100) });
      const { data: sd, error: sessionError } = await supabase.auth.exchangeCodeForSession(url);
      if (sessionError) {
        log.error('exchangeCodeForSession failed', { source, message: sessionError.message });
        Alert.alert('Sign-In Failed', sessionError.message);
      } else {
        log.info('Google sign-in successful', { source, userId: sd.user?.id });
        // Navigation handled by auth state listener in _layout.tsx
      }
      setGoogleLoading(false);
    };

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL received from Supabase');

      log.debug('OAuth URL check', {
        oauthUrlHasLocalhost: data.url.includes('localhost'),
        hasOurRedirect: data.url.includes(encodeURIComponent(redirectUrl)),
        oauthUrlPreview: data.url.substring(0, 120),
      });

      // PATH A — deep link safety net
      // Primary path is Path B (RedirectUriReceiverActivity intercepts myapp://).
      // This listener fires if somehow the URL arrives via Linking instead
      // (e.g. Expo Go routes myapp:// to onNewIntent before RedirectUriReceiverActivity).
      linkSub = Linking.addEventListener('url', ({ url }) => {
        log.debug('PATH A: deep link received', { url: url.substring(0, 100) });
        linkSub?.remove();
        WebBrowser.dismissBrowser().catch(() => {});
        exchangeCode(url, 'deep-link');
      });

      log.debug('Opening browser for Google OAuth');

      // PATH B — WebBrowser (primary on Android: RedirectUriReceiverActivity catches myapp://)
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      // ── This log is critical — if it never appears the browser is still open ──
      log.debug('PATH B: WebBrowser resolved', {
        type: result.type,
        sessionAlreadyResolved: sessionResolved,
        returnedUrl: result.type === 'success' ? result.url.substring(0, 100) : '(none)',
      });

      if (result.type === 'success') {
        await exchangeCode(result.url, 'web-browser');
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        if (!sessionResolved) {
          linkSub?.remove();
          log.info('Google sign-in cancelled by user', { type: result.type });
          setGoogleLoading(false);
        }
      } else {
        // e.g. 'locked' on Android — browser already open, or unknown type
        // MUST clear loading here or the spinner hangs forever
        log.warn('WebBrowser unexpected type — clearing loading', {
          type: result.type,
          sessionAlreadyResolved: sessionResolved,
        });
        if (!sessionResolved) {
          linkSub?.remove();
          setGoogleLoading(false);
        }
      }

    } catch (err: unknown) {
      linkSub?.remove();
      if (!sessionResolved) {
        const message = err instanceof Error ? err.message : 'Google sign-in failed';
        log.error('Google sign-in error', { message });
        Alert.alert('Sign-In Failed', message);
        setGoogleLoading(false);
      }
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
