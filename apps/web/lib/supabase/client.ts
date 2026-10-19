import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase for client components: Auth session and Realtime channels only. Returns one shared client in the browser.
 * The session cookies are Secure on https (SameSite=Lax stays from @supabase/ssr). The keys are read directly, not
 * through lib/env.ts: its zod (about 90 KB gz) would load with every first API request and the manage claim
 * (TASK-17.17). The server has validated them already (proxy.ts imports lib/env.ts on every request); NEXT_PUBLIC_*
 * is inlined at build, and an empty one makes @supabase/ssr throw here (URL and API key required).
 */
export function createClient() {
	return createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
		{ cookieOptions: { secure: window.location.protocol === 'https:' } }
	);
}
