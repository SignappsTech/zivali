import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/lib/env';

// Auth session and Realtime only; data goes through the REST API (@zivali/api).
export const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
	auth: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
	if (state === 'active') supabase.auth.startAutoRefresh();
	else supabase.auth.stopAutoRefresh();
});
