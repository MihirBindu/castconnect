import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from './logger';

const log = createLogger('supabase');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  log.error('EXPO_PUBLIC_SUPABASE_URL is not set. Create a .env file from .env.example.');
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL. Check your .env file.');
}
if (!supabaseAnonKey) {
  log.error('EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. Create a .env file from .env.example.');
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY. Check your .env file.');
}

log.info('Initialising Supabase client', { url: supabaseUrl });

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
