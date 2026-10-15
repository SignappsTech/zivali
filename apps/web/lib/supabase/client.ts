import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/lib/env';

/** Supabase for client components: Auth session and Realtime channels only. Returns one shared client in the browser. */
export function createClient() {
	return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
