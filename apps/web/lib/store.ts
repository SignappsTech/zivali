import { createApiClient, type Locale } from '@zivali/api/client';
import { createApiStore } from '@zivali/api/rtk';

// The store is in every page's bundle, so it imports neither lib/env.ts (zod) nor supabase-js (about 90 KB gz between
// them, TASK-11.2). The server has validated the API URL in lib/env.ts already (proxy.ts imports it on every request);
// the fallback is env.ts's APP_ENV=local default.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/** Plain API client with the session token, for the store and for code without one (photo uploads, C5). */
export function makeApiClient(locale: Locale) {
	return createApiClient({
		baseUrl: API_URL,
		locale,
		// Read on every request, so a refreshed session token is picked up. supabase-js loads with the first request.
		getAccessToken: async () => {
			const { createClient } = await import('@/lib/supabase/client');
			return (await createClient().auth.getSession()).data.session?.access_token;
		},
	});
}

/** Redux store for client components: RTK Query over the REST API (ADR-020 §Client). One per session or SSR request. */
export function makeStore(locale: Locale) {
	return createApiStore(makeApiClient(locale));
}
