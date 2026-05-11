export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  accent: string;
  accentGreen: string;
  accentBlue: string;
  accentRed: string;
  accentOrange: string;
  white: string;
  black: string;
  overlay: string;
  cardGradientStart: string;
  cardGradientEnd: string;
  tabBar: string;
  statusApplied: string;
  statusShortlisted: string;
  statusSelected: string;
  statusRejected: string;
};

const shared = {
  primary: '#D4A853',
  primaryDark: '#B8922F',
  primaryLight: '#E8C97A',
  accent: '#D4A853',
  accentGreen: '#34C759',
  accentBlue: '#007AFF',
  accentRed: '#FF3B30',
  accentOrange: '#FF9500',
  white: '#FFFFFF',
  black: '#000000',
  statusApplied: '#007AFF',
  statusShortlisted: '#FF9500',
  statusSelected: '#34C759',
  statusRejected: '#FF3B30',
};

export const darkTheme: ThemeColors = {
  ...shared,
  background: '#0A0A0C',
  surface: '#141418',
  surfaceLight: '#1C1C22',
  surfaceElevated: '#242430',
  text: '#F5F5F7',
  textSecondary: '#8E8E93',
  textTertiary: '#5A5A60',
  border: '#2C2C34',
  borderLight: '#3A3A44',
  overlay: 'rgba(0,0,0,0.6)',
  cardGradientStart: '#1A1A22',
  cardGradientEnd: '#12121A',
  tabBar: '#0D0D10',
};

export const midTheme: ThemeColors = {
  ...shared,
  background: '#0D1117',
  surface: '#161C27',
  surfaceLight: '#1E2736',
  surfaceElevated: '#262F42',
  text: '#E8EAF0',
  textSecondary: '#8B93AA',
  textTertiary: '#505870',
  border: '#232C3E',
  borderLight: '#2C374F',
  overlay: 'rgba(0,0,0,0.65)',
  cardGradientStart: '#1A2230',
  cardGradientEnd: '#111820',
  tabBar: '#0B0F18',
};

export const lightTheme: ThemeColors = {
  ...shared,
  background: '#F5F5F7',
  surface: '#FFFFFF',
  surfaceLight: '#EBEBF0',
  surfaceElevated: '#E1E1E8',
  text: '#0A0A0C',
  textSecondary: '#48484A',
  textTertiary: '#8E8E93',
  border: '#D8D8DC',
  borderLight: '#C7C7CC',
  overlay: 'rgba(0,0,0,0.45)',
  cardGradientStart: '#FFFFFF',
  cardGradientEnd: '#F5F5F7',
  tabBar: '#FFFFFF',
};

export const THEMES = {
  dark: darkTheme,
  mid: midTheme,
  light: lightTheme,
} as const;

const Colors = darkTheme;
export default Colors;
