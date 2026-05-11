import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, THEMES } from '@/constants/colors';

export type ThemeMode = 'dark' | 'mid' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  colors: THEMES.dark,
  setMode: () => {},
});

const THEME_KEY = '@cc_theme_mode';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(stored => {
      if (stored === 'dark' || stored === 'mid' || stored === 'light') {
        setModeState(stored);
      }
      setThemeLoaded(true);
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(THEME_KEY, newMode).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({ mode, colors: THEMES[mode], setMode }),
    [mode, setMode]
  );

  if (!themeLoaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}
