import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';

import { env } from '@/lib/env';

/**
 * Refreshes an expired Supabase session before the request is routed. Refreshed cookies go onto the request first,
 * so `next` (next-intl, which copies the request headers) hands them to server components, then onto the response.
 */
export async function updateSession(
	request: NextRequest,
	next: (request: NextRequest) => NextResponse
): Promise<NextResponse> {
	let written: Parameters<SetAllCookies> = [[], {}];

	const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => request.cookies.getAll(),
			setAll: (cookiesToSet, headers) => {
				for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
				written = [cookiesToSet, headers];
			},
		},
	});
	// Keep this right after createServerClient (Supabase SSR guide): it loads the session and refreshes it if needed.
	await supabase.auth.getClaims();

	const response = next(request);
	const [cookiesToSet, headers] = written;
	for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
	// Responses that set auth cookies must not be cached (no-store headers from @supabase/ssr).
	for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
	return response;
}
