import { createApiClient, type Locale, uuid } from '@zivali/api/client';
import { createApiStore } from '@zivali/api/rtk';

// The store is in the bundle of every page that calls the API, so it imports neither lib/env.ts (zod) nor supabase-js
// (about 90 KB gz between them, TASK-11.2). The server has validated the API URL in lib/env.ts already (proxy.ts
// imports it on every request); the fallback is env.ts's APP_ENV=local default.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const DEVICE_KEY = 'device_id';

/**
 * This browser's uuid for `x-device-id` (C7: the anonymous report limits count per device), made once and kept in
 * localStorage. Undefined on the server; blocked storage gets a per-tab id, so the API falls back to its IP limits.
 */
export function deviceId(): string | undefined {
	if (typeof window === 'undefined') return undefined;
	try {
		let id = localStorage.getItem(DEVICE_KEY);
		if (!id) localStorage.setItem(DEVICE_KEY, (id = uuid()));
		return id;
	} catch {
		return uuid();
	}
}

/** Plain API client with the session token, for the store and for code without one (photo uploads, C5). */
export function makeApiClient(locale: Locale) {
	return createApiClient({
		baseUrl: API_URL,
		locale,
		deviceId: deviceId(),
		// Read on every request, so a refreshed session token is picked up. supabase-js loads with the first request.
		getAccessToken: async () => {
			const { createClient } = await import('@/lib/supabase/client');
			return (await createClient().auth.getSession()).data.session?.access_token;
		},
	});
}

/** Redux store for client components: RTK Query over the REST API (ADR-020 §Client). */
export function makeStore(locale: Locale) {
	return createApiStore(makeApiClient(locale));
}

let current: { locale: Locale; store: ReturnType<typeof makeStore> } | undefined;

/**
 * The store of a StoreProvider. In the browser a single slot for the current locale (a locale switch drops the old store, so no previous user's cache outlives it) (responses are localised, Accept-Language), shared by
 * every provider in the tab, so the cache reset on a user change (SessionSync) reaches the page's queries too. On the
 * server a new one per render, never shared between users.
 */
export function getStore(locale: Locale) {
	if (typeof window === 'undefined') return makeStore(locale);
	if (current?.locale !== locale) current = { locale, store: makeStore(locale) };
	return current.store;
}
