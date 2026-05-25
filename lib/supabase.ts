import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from './logger';

// ── Critical patch ────────────────────────────────────────────────────────────
// React Native uses whatwg-fetch as its fetch polyfill. whatwg-fetch calls
// reject() inside setTimeout(fn, 0) in its xhr.onerror handler. In Hermes /
// React Native the runtime reports that setTimeout-sourced rejection as
// "unhandled" before the outer async function's catch clause runs, producing
// the red ERROR boxes in dev even though the error IS caught upstream.
//
// Wrapping global.fetch so we immediately attach .then(resolve, reject) gives
// Hermes a synchronous handler on the inner promise, making the rejection
// "handled" before the setTimeout fires.
// ---------------------------------------------------------------------------
(function patchFetch() {
  if (typeof global === 'undefined') return;
  const g = global as Record<string, unknown>;
  if (typeof g.fetch !== 'function') return;
  const _orig = g.fetch as typeof fetch;
  g.fetch = function safeFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      _orig(input, init).then(resolve, reject);
    });
  };
})();
// ─────────────────────────────────────────────────────────────────────────────

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

// ── Network error utilities ──────────────────────────────────────────────────

export class NetworkError extends Error {
  constructor(cause?: string) {
    super(cause ?? 'Network request failed');
    this.name = 'NetworkError';
  }
}

const NETWORK_PHRASES = [
  'network request failed',
  'failed to fetch',
  'fetch failed',
  'networkerror',
  'econnrefused',
  'enotfound',
  'err_internet_disconnected',
  'err_name_not_resolved',
  'request timed out',
  'the internet connection appears to be offline',
  'could not connect to the server',
  'socket hang up',
  'load failed',
  'software caused connection abort',
];

export function isNetworkError(err: unknown): boolean {
  if (err instanceof NetworkError) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return NETWORK_PHRASES.some(p => msg.includes(p));
}

export function networkErrorMessage(): string {
  return 'No connection. Check your internet and try again.';
}
