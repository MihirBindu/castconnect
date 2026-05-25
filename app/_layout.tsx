import 'react-native-url-polyfill/auto';
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
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
  // Track the current route segment so we never navigate to a screen we're
  // already on — without this guard router.replace('/auth/login') causes
  // Expo Router to tear down and remount the root layout, creating an
  // infinite redirect loop.
  const segments = useSegments();

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

  // Single source of truth for all auth-driven navigation.
  // `segments` tells us where the router currently is so we never call
  // router.replace to a screen we're already on — that's what was causing
  // the remount loop.
  useEffect(() => {
    if ((!fontsLoaded && !fontError) || session === undefined) return;

    SplashScreen.hideAsync();

    const inAuth = segments[0] === 'auth';

    if (!session && !inAuth) {
      log.info('No session — redirecting to login');
      router.replace('/auth/login');
    } else if (session && inAuth) {
      log.info('Session active — redirecting to app');
      router.replace('/(tabs)');
    }
  }, [fontsLoaded, fontError, session, segments]);

  if ((!fontsLoaded && !fontError) || session === undefined) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <ThemeProvider>
              <AppProvider session={session}>
                <RootLayoutNav />
              </AppProvider>
            </ThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
