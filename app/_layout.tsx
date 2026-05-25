import 'react-native-url-polyfill/auto';
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
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
          if (isNetworkError({ message: error.message })) {
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
      // Only redirect on an explicit sign-out, not on any transient null session
      if (event === 'SIGNED_OUT') {
        router.replace('/auth/login');
      }
      if (!s && event !== 'INITIAL_SESSION' && event !== 'SIGNED_OUT' && event !== 'TOKEN_REFRESHED') {
        router.replace('/auth/login');
      }
      if (event === 'TOKEN_REFRESHED') {
        log.info('Token refreshed successfully');
      }
    });

    return () => {
      log.debug('Unsubscribing auth listener');
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && session !== undefined) {
      log.info('App ready — hiding splash screen', { hasSession: !!session });
      SplashScreen.hideAsync();
      if (!session) {
        log.info('No session — redirecting to login');
        router.replace('/auth/login');
      }
    }
  }, [fontsLoaded, fontError, session]);

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
