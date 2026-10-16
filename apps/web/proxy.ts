import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';

import { ShortCode } from '@zivali/validation/common.schema';
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
	// Presigned photo PUTs and GETs (C5): the one origin the API presigns with (R2 in the EU jurisdiction, MinIO
	// locally); connect-src for the uploads, img-src for the saved photos shown from signed GET URLs.
	const uploads = ` ${new URL(env.R2_UPLOAD_ORIGIN).origin}`;
	// Published report photos (PublicReport.photos[].url, C5) come from the public media bucket.
	const media = env.MEDIA_BASE_URL ? ` ${new URL(env.MEDIA_BASE_URL).origin}` : '';
	// Turnstile (C7, components/auth/turnstile.tsx): its script (trusted through 'strict-dynamic'; the host is the
	// fallback for browsers without it) and its challenge iframe.
	const captcha = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? ' https://challenges.cloudflare.com' : '';
	// MapView (C6): OpenFreeMap tiles, sprite and glyphs.
	const tiles = ' https://tiles.openfreemap.org';

	return [
		"default-src 'self'",
		// React needs eval in development only, for its error overlays.
		`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${captcha}${dev ? " 'unsafe-eval'" : ''}`,
		// React writes style attributes (Radix positioning); a nonce in this list would switch 'unsafe-inline' off.
		"style-src 'self' 'unsafe-inline'",
		`img-src 'self' blob: data:${uploads}${media}${ga}`,
		"font-src 'self'",
		`connect-src 'self' ${api} ${supabase.origin} ${realtime}${uploads}${ga}${tiles}`,
		// MapLibre's worker, a same-origin module ('strict-dynamic' above ignores 'self' for workers).
		"worker-src 'self'",
		...(captcha ? [`frame-src${captcha}`] : []),
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		...(env.APP_ENV === 'local' ? [] : ['upgrade-insecure-requests']),
	].join('; ');
}

/** The report detail page, /r/<code> and /en/r/<code> (C15). */
const REPORT_PAGE = /^\/(?:en\/)?r\/([^/]+)\/?$/;

/**
 * The HTTP status of a report page, which only the proxy can set: 410 for hidden, removed and long-closed reports
 * (FR-007 AC#3), 404 for unknown codes; undefined keeps 200. Asks the API as the viewer, so a manager still gets the
 * report. A failed or slow check (1 s) also keeps 200: the page then shows what the API tells it.
 */
async function reportStatus(code: string, token: string | undefined): Promise<410 | 404 | undefined> {
	try {
		const response = await fetch(
			`${env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '')}/v1/reports/${encodeURIComponent(code)}`,
			{
				headers: token ? { authorization: `Bearer ${token}` } : {},
				signal: AbortSignal.timeout(1000),
			}
		);
		await response.body?.cancel();
		if (response.status === 410) return 410;
		// Held reads as unknown to non-managers (C4); a malformed code is unknown too.
		return response.status === 404 || response.status === 400 ? 404 : undefined;
	} catch {
		return undefined;
	}
}

/** next-intl's routing, plus the report page's status on document requests (client navigations need none). */
async function route(request: NextRequest, accessToken: () => Promise<string | undefined>) {
	const response = handleI18nRouting(request);
	const code = REPORT_PAGE.exec(request.nextUrl.pathname)?.[1];
	if (!code || request.headers.has('rsc') || response.headers.has('location')) return response;
	// A code outside the short-code alphabet (C1 ShortCode) is unknown without asking anyone.
	const status = ShortCode.safeParse(code).success ? await reportStatus(code, await accessToken()) : 404;
	// Same headers (the locale rewrite, the request headers it passes on), another status: the page still renders.
	return status ? new NextResponse(null, { status, headers: response.headers }) : response;
}

export async function proxy(request: NextRequest) {
	const nonce = btoa(crypto.randomUUID());
	const csp = contentSecurityPolicy(nonce);
	// next-intl copies the request headers into its rewrite, so the layout and Next.js see both.
	request.headers.set('x-nonce', nonce);
	request.headers.set('content-security-policy', csp);
	// The page as requested, for the guards' `next` (lib/viewer.ts requireViewer); set here, so never the client's.
	request.headers.set('x-next-path', request.nextUrl.pathname + request.nextUrl.search);

	const response = await updateSession(request, route);
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
	// Pages only: not API routes, Next.js internals or files with an extension (next-intl matcher), nor the
	// unlocalised /captcha page for the mobile WebView (C15; its CSP is in next.config.ts), nor the reports' Open
	// Graph images (app/r/[code]/opengraph-image, C15).
	matcher: '/((?!api|captcha(?:/|$)|r/[^/]+/opengraph-image$|_next|.*\\..*).*)',
};
