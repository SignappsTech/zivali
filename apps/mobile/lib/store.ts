import { configureAuth } from '@zivali/api/auth';
import { createApiClient } from '@zivali/api/client';
import { createApiStore } from '@zivali/api/rtk';
import { env } from '@/lib/env';
import { getCurrentLocale } from '@/lib/i18n';
import { setupNetworkListeners } from '@/lib/net';
import { supabase } from '@/lib/supabase';

// The one Redux store (RTK Query over the REST API, ADR-020). Accept-Language follows the UI locale per request.
export const store = createApiStore(
	createApiClient({
		baseUrl: env.EXPO_PUBLIC_API_URL,
		locale: getCurrentLocale,
		// Read on every request, so a refreshed session token is picked up.
		getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token,
	})
);

// Once, at start-up: refetchOnReconnect/Focus, and the cache follows the Supabase session.
setupNetworkListeners(store.dispatch);
configureAuth(supabase, store);
