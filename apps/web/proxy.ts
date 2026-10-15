import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';

import { hreflangLink } from '@/i18n/alternates';
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
	// GA4 hits and pixel after consent (C12); gtag.js itself is trusted through the nonce.
	const ga =
		env.NEXT_PUBLIC_ANALYTICS_PROVIDER === 'ga4'
			? ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com'
			: '';
	// Presigned photo PUTs (C5): the one origin the API presigns with (R2 in the EU jurisdiction, MinIO locally).
	const uploads = ` ${new URL(env.R2_UPLOAD_ORIGIN).origin}`;
	// Turnstile (C7, components/auth/turnstile.tsx): its script (trusted through 'strict-dynamic'; the host is the
	// fallback for browsers without it) and its challenge iframe.
	const captcha = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? ' https://challenges.cloudflare.com' : '';

	return [
		"default-src 'self'",
		// React needs eval in development only, for its error overlays.
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${captcha}${dev ? " 'unsafe-eval'" : ''}`,
		// React writes style attributes (Radix positioning); a nonce in this list would switch 'unsafe-inline' off.
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' blob: data:${ga}`,
		"font-src 'self'",
		`connect-src 'self' ${api} ${supabase.origin} ${realtime}${uploads}${ga}`,
		...(captcha ? [`frame-src${captcha}`] : []),
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
	// The page as requested, for the guards' `next` (lib/viewer.ts requireViewer); set here, so never the client's.
	request.headers.set('x-next-path', request.nextUrl.pathname + request.nextUrl.search);

	const response = await updateSession(request, handleI18nRouting);
	response.headers.set('content-security-policy', csp);

	// Internal path: the rewrite target when the URL was localised, else the request path (already internal).
	const rewrite = response.headers.get('x-middleware-rewrite');
	const internal = new URL(rewrite ?? request.url).pathname.replace(/^\/(sl|en)(?=\/|$)/, '') || '/';
	const link =
		rewrite || !response.headers.has('location') ? hreflangLink(env.NEXT_PUBLIC_APP_URL, internal) : undefined;
	if (link) response.headers.set('link', link);
	return response;
}

export const config = {
	// Pages only: not API routes, Next.js internals or files with an extension (next-intl matcher).
	matcher: '/((?!api|_next|.*\\..*).*)',
};
