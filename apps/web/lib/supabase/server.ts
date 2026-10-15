import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/lib/env';

/**
 * Supabase for server components, route handlers and server actions: Auth session only (data goes through the API).
 * Create one per request, never share it. The session cookies are Secure on an https app URL (SameSite=Lax stays).
 */
export async function createClient() {
	const cookieStore = await cookies();

	return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookieOptions: { secure: env.NEXT_PUBLIC_APP_URL.startsWith('https:') },
		cookies: {
			getAll: () => cookieStore.getAll(),
			setAll: (cookiesToSet) => {
				try {
					for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
				} catch {
					// Server components cannot write cookies; the proxy (lib/supabase/middleware.ts) refreshes the session.
				}
			},
		},
	});
}
