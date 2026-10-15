import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { configureAuth } from '@zivali/api/auth';
import { createApiClient } from '@zivali/api/client';
import { createApiStore } from '@zivali/api/rtk';
import { env } from '@/lib/env';
import { getCurrentLocale } from '@/lib/i18n';
import { setupNetworkListeners } from '@/lib/net';
import { supabase } from '@/lib/supabase';

/**
 * One random id per install, sent as `x-device-id` on every request (C7: anonymous rate limits and holds per device).
 * Not personal data; it stays across sign-out so a sign-out does not reset the limits.
 */
export function deviceId(): string {
	const stored = SecureStore.getItem('device_id');
	if (stored) return stored;
	const id = randomUUID();
	SecureStore.setItem('device_id', id);
	return id;
}

// The REST API client (ADR-020), also used without the store (photo uploads, outbox). Accept-Language follows the UI
// locale per request.
export const apiClient = createApiClient({
	baseUrl: env.EXPO_PUBLIC_API_URL,
	deviceId: deviceId(),
	locale: getCurrentLocale,
	// Read on every request, so a refreshed session token is picked up.
	getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
});

// The one Redux store (RTK Query over the API client).
export const store = createApiStore(apiClient);

// Once, at start-up: refetchOnReconnect/Focus, and the cache follows the Supabase session.
setupNetworkListeners(store.dispatch);
configureAuth(supabase, store);
