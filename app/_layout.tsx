import 'react-native-url-polyfill/auto';
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { Session } from "@supabase/supabase-js";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppProvider } from "@/lib/AppProvider";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";
import { supabase, isNetworkError } from "@/lib/supabase";
import { getProfileStatus } from "@/lib/api/profiles";
import { ProfileGateContext, ProfileGateState } from "@/lib/ProfileGate";
import { OnboardingStatus } from "@/lib/types";
import { createLogger } from "@/lib/logger";

const log = createLogger('RootLayout');

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'light' ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/complete-profile" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="onboarding/professional-profile" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="casting/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="crew-basket" options={{ headerShown: false }} />
        <Stack.Screen name="crew-review" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // The user's current onboarding step (from the backend). Drives the gate that
  // walks users through onboarding and keeps them off the dashboard until done.
  const [gateStatus, setGateStatus] = useState<ProfileGateState>('idle');
  const [refreshKey, setRefreshKey] = useState(0);
  // Track the current route segment so we never navigate to a screen we're
  // already on — without this guard router.replace('/auth/login') causes
  // Expo Router to tear down and remount the root layout, creating an
  // infinite redirect loop.
  const segments = useSegments();
  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (fontError) {
      log.error('Font loading failed', { error: fontError.message });
    }
  }, [fontError]);

  useEffect(() => {
    log.info('Fetching initial session');

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          if (isNetworkError(error)) {
            log.warn('getSession: network error during token refresh', { message: error.message });
          } else {
            log.error('Failed to get session', { message: error.message });
          }
          setSession(null);
          return;
        }
        log.info('Session fetched', { hasSession: !!data.session, userId: data.session?.user.id });
        setSession(data.session);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        if (isNetworkError(err)) {
          log.warn('getSession threw: network error', { message });
        } else {
          log.error('getSession threw', { message });
        }
        setSession(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      log.info('Auth state changed', { event, userId: s?.user.id });
      setSession(s);
      if (event === 'TOKEN_REFRESHED') {
        log.info('Token refreshed successfully');
      }
    });

    return () => {
      log.debug('Unsubscribing auth listener');
      subscription.unsubscribe();
    };
  }, []);

  // Whenever we have a signed-in user, check whether their profile is complete.
  // Depends on the user id (not the whole session) so a token refresh doesn't
  // trigger a redundant re-check. `refreshKey` lets the retry screen re-run it.
  useEffect(() => {
    if (!userId) {
      setGateStatus('idle');
      return;
    }
    let cancelled = false;
    setGateStatus('checking');
    log.info('Checking onboarding status', { userId });
    getProfileStatus(userId).then((res) => {
      if (cancelled) return;
      if (res === 'network-error') {
        log.warn('Onboarding status check failed (network)', { userId });
        setGateStatus('error');
      } else {
        log.info('Onboarding status resolved', { userId, exists: res.exists, status: res.onboardingStatus });
        setGateStatus(res.onboardingStatus);
      }
    });
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  const bootLoading = (!fontsLoaded && !fontError) || session === undefined;

  // A concrete backend onboarding status (not the transient idle/checking/error).
  const resolvedStatus: OnboardingStatus | null =
    gateStatus === 'PERSONAL_PROFILE_PENDING' ||
    gateStatus === 'PROFESSIONAL_PROFILE_PENDING' ||
    gateStatus === 'PORTFOLIO_PENDING' ||
    gateStatus === 'COMPLETED'
      ? gateStatus
      : null;

  // Where the router currently is (segment 0 = section, segment 1 = onboarding step).
  const rootSegment = segments[0] as string;
  const onboardingStep = segments[1] as string | undefined;
  const inAuth = rootSegment === 'auth';
  const inOnboarding = rootSegment === 'onboarding';
  const onPersonalStep = inOnboarding && onboardingStep === 'complete-profile';

  // Whether the current status requires a redirect from where we are. Personal
  // step is locked to step 1; professional step allows either onboarding page
  // (so "Back" to step 1 works) but nothing outside onboarding.
  const needsRedirect =
    !!session &&
    resolvedStatus !== null &&
    ((resolvedStatus === 'PERSONAL_PROFILE_PENDING' && !onPersonalStep) ||
      (resolvedStatus === 'PROFESSIONAL_PROFILE_PENDING' && !inOnboarding) ||
      ((resolvedStatus === 'COMPLETED' || resolvedStatus === 'PORTFOLIO_PENDING') &&
        (inAuth || inOnboarding)));

  // Single source of truth for all auth-driven navigation. `segments` tells us
  // where the router currently is so we never redirect to a screen we're already
  // on — that's what was causing the remount loop.
  useEffect(() => {
    if (bootLoading) return;

    SplashScreen.hideAsync();

    if (!session) {
      // Unauthenticated users can't reach onboarding or the dashboard.
      if (!inAuth) {
        log.info('No session — redirecting to login');
        router.replace('/auth/login');
      }
      return;
    }

    // Don't route a signed-in user until we know their onboarding status —
    // otherwise the dashboard flashes before an incomplete user is redirected.
    if (resolvedStatus === null) return;

    switch (resolvedStatus) {
      case 'PERSONAL_PROFILE_PENDING':
        if (!onPersonalStep) {
          log.info('Personal profile pending — routing to step 1');
          router.replace('/onboarding/complete-profile' as never);
        }
        break;
      case 'PROFESSIONAL_PROFILE_PENDING':
        // Allow being on either onboarding step so "Back" to step 1 works;
        // only pull the user in if they've left onboarding entirely.
        if (!inOnboarding) {
          log.info('Professional profile pending — routing to step 2');
          router.replace('/onboarding/professional-profile' as never);
        }
        break;
      case 'PORTFOLIO_PENDING':
      case 'COMPLETED':
        if (inAuth || inOnboarding) {
          log.info('Onboarding complete — routing to app');
          router.replace('/(tabs)');
        }
        break;
    }
  }, [bootLoading, session, resolvedStatus, inAuth, inOnboarding, onPersonalStep]);

  const setStatus = useCallback((s: OnboardingStatus) => setGateStatus(s), []);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const gateValue = useMemo(() => ({ setStatus, refresh }), [setStatus, refresh]);

  if (bootLoading) {
    return null;
  }

  // The navigator must stay mounted for router.replace redirects to work, so we
  // cover it with a full-screen gate overlay while a signed-in user is being
  // verified or redirected — that prevents the dashboard/auth screens from
  // flashing before the redirect lands.
  const showLoadingOverlay =
    !!session && (gateStatus === 'idle' || gateStatus === 'checking' || needsRedirect);
  const showErrorOverlay = !!session && gateStatus === 'error';

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <ThemeProvider>
              <AppProvider session={session}>
                <ProfileGateContext.Provider value={gateValue}>
                  <View style={{ flex: 1 }}>
                    <RootLayoutNav />
                    {showLoadingOverlay && <GateOverlay mode="loading" />}
                    {showErrorOverlay && (
                      <GateOverlay
                        mode="error"
                        onRetry={refresh}
                        onSignOut={() => { supabase.auth.signOut().catch(() => {}); }}
                      />
                    )}
                  </View>
                </ProfileGateContext.Provider>
              </AppProvider>
            </ThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// ── Gate overlay ───────────────────────────────────────────────────────────────
// Rendered on top of the navigator (inside the theme provider) so it matches the
// active theme and blocks interaction with the screen underneath.
function GateOverlay({
  mode,
  onRetry,
  onSignOut,
}: {
  mode: 'loading' | 'error';
  onRetry?: () => void;
  onSignOut?: () => void;
}) {
  const C = useTheme().colors;
  return (
    <View style={[gateStyles.overlay, { backgroundColor: C.background }]}>
      {mode === 'loading' ? (
        <>
          <ActivityIndicator color={C.primary} size="large" />
          <Text style={[gateStyles.label, { color: C.textSecondary }]}>Loading your profile…</Text>
        </>
      ) : (
        <>
          <Text style={[gateStyles.title, { color: C.text }]}>Couldn&apos;t load your profile</Text>
          <Text style={[gateStyles.body, { color: C.textSecondary }]}>
            We couldn&apos;t reach the server. Check your internet connection and try again.
          </Text>
          <TouchableOpacity
            style={[gateStyles.retryBtn, { backgroundColor: C.primary }]}
            onPress={onRetry}
            activeOpacity={0.85}
          >
            <Text style={[gateStyles.retryText, { color: C.black }]}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={gateStyles.signOutBtn} onPress={onSignOut} activeOpacity={0.7}>
            <Text style={[gateStyles.signOutText, { color: C.textSecondary }]}>Sign Out</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const gateStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  label: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 20,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  retryText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
  },
  signOutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  signOutText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
  },
});
