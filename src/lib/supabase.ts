import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createAuthFetch } from './authFetch';

/**
 * Reads config from EXPO_PUBLIC_* env vars (see .env / .env.example).
 * If they're missing, the app falls back to local demo mode — nothing breaks.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * `expo export -p web` renders every route in Node to produce the static HTML.
 * There is no `window` in that pass, and createClient() restores the session
 * eagerly — which sends AsyncStorage's web build straight into localStorage.
 * Nobody is signed in while prerendering, so hand it a store that says so.
 */
const isBrowser = typeof window !== 'undefined';

const noopStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      global: {
        fetch: createAuthFetch(`${url!.replace(/\/$/, '')}/auth/v1`),
      },
      auth: {
        storage: isBrowser ? AsyncStorage : noopStorage,
        autoRefreshToken: isBrowser,
        persistSession: isBrowser,
        detectSessionInUrl: false,
      },
    })
  : null;

/** Palette used to give each new member a distinct avatar color. */
export const MEMBER_PALETTE = ['#FF0044', '#4C6FFF', '#12B76A', '#F79009', '#9E77ED', '#EE46BC', '#06AED4'];
