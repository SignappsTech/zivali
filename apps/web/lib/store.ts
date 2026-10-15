import { createApiClient, type Locale } from '@zivali/api/client';
import { createApiStore } from '@zivali/api/rtk';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/client';

/** Plain API client with the session token, for the store and for code without one (photo uploads, C5). */
export function makeApiClient(locale: Locale) {
	return createApiClient({
		baseUrl: env.NEXT_PUBLIC_API_URL,
		locale,
		// Read on every request, so a refreshed session token is picked up.
		getAccessToken: async () => (await createClient().auth.getSession()).data.session?.access_token,
	});
}

/** Redux store for client components: RTK Query over the REST API (ADR-020 §Client). One per session or SSR request. */
export function makeStore(locale: Locale) {
	return createApiStore(makeApiClient(locale));
}
