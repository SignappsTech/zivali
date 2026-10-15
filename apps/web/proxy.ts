import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { updateSession } from '@/lib/supabase/middleware';

const handleI18nRouting = createMiddleware(routing);

/**
 * Nonce-based CSP for every page (scaffold; feature tasks add their origins: tiles, Turnstile, GA, media).
 * Next.js reads the nonce from the request header and puts it on its own scripts; pages render dynamically.
 */
function contentSecurityPolicy(nonce: string): string {
	const supabase = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
	const realtime = supabase.origin.replace(/^http/, 'ws');
	const api = new URL(env.NEXT_PUBLIC_API_URL).origin;
	const dev = process.env.NODE_ENV === 'development';

	return [
		"default-src 'self'",
		// React needs eval in development only, for its error overlays.
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
		// React writes style attributes (Radix positioning); a nonce in this list would switch 'unsafe-inline' off.
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' blob: data:",
		"font-src 'self'",
		`connect-src 'self' ${api} ${supabase.origin} ${realtime}`,
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		...(env.APP_ENV === 'local' ? [] : ['upgrade-insecure-requests']),
	].join('; ');
}

export async function proxy(request: NextRequest) {
	const nonce = btoa(crypto.randomUUID());
	const csp = contentSecurityPolicy(nonce);
	// next-intl copies the request headers into its rewrite, so the layout and Next.js see both.
	request.headers.set('x-nonce', nonce);
	request.headers.set('content-security-policy', csp);

	const response = await updateSession(request, handleI18nRouting);
	response.headers.set('content-security-policy', csp);
	return response;
}

export const config = {
	// Pages only: not API routes, Next.js internals or files with an extension (next-intl matcher).
	matcher: '/((?!api|_next|.*\\..*).*)',
};
