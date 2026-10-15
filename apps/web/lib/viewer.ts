import type { Locale } from 'next-intl';
import { headers } from 'next/headers';
import { cache } from 'react';

import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

export type Viewer = { initials: string; aal2: boolean };

const toViewer = (claims: {
	aal?: string;
	email?: string;
	user_metadata?: { full_name?: string; name?: string };
}): Viewer => {
	// The user's own name or email, shown only to them as avatar initials: "ana.novak@…" → "AN".
	const { full_name, name } = claims.user_metadata ?? {};
	const words = String(full_name || name || claims.email?.split('@')[0] || '')
		.split(/[\s._-]+/)
		.filter(Boolean);
	return {
		aal2: claims.aal === 'aal2',
		initials: words
			.slice(0, 2)
			.map((word) => word[0]!.toUpperCase())
			.join(''),
	};
};

/**
 * The signed-in user for the shell's avatar, read from the session cookie (refreshed by proxy.ts) without verifying
 * it: UX only. Whatever lets a visitor in or sends them on uses requireViewer or getVerifiedViewer, and the API and RLS
 * enforce access (C15). Server-side, so signed-out pages ship no supabase-js. An anonymous finder session (C7) counts
 * as signed out.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
	const { data } = await (await createClient()).auth.getSession();
	const token = data.session?.access_token;
	if (!token) return null;
	try {
		const claims = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
		return claims.is_anonymous ? null : toViewer(claims);
	} catch {
		return null;
	}
});

/** The session's claims once `getClaims()` has checked the signature (project JWKS, or getUser for HS256). */
const verifiedClaims = async () => (await (await createClient()).auth.getClaims()).data?.claims;

/**
 * The signed-in user exactly as requireViewer lets them through (verified, not anonymous), else null. Sign-in and
 * sign-up send this user on, so a session the guards refuse (forged, a retired key) gets the form, not a redirect loop.
 */
export async function getVerifiedViewer(): Promise<Viewer | null> {
	const claims = await verifiedClaims();
	return claims && !claims.is_anonymous ? toViewer(claims) : null;
}

/**
 * Server guard of the (app), (admin) and (portal) layouts and the account pages: visitors without a verified session
 * go to sign-in, with the page they asked for as `next` (the proxy's x-next-path), so they come back to it.
 * Anonymous sessions (C7, C15 report managers coming in through /m) pass only with `allowAnonymous`.
 */
export async function requireViewer(locale: string, { allowAnonymous = false } = {}): Promise<Viewer> {
	const claims = await verifiedClaims();
	if (claims && (allowAnonymous || !claims.is_anonymous)) return toViewer(claims);
	const next = (await headers()).get('x-next-path');
	return redirect({
		href: next ? { pathname: '/sign-in', query: { next } } : '/sign-in',
		locale: locale as Locale,
	});
}

/**
 * A same-site path to return to after sign-in, or undefined: the `next` query param is user input, so only a path on
 * this origin passes (no `//host` or `/\host`, no scheme). Returns the normalised pathname and search, which is what
 * the redirects use: dot segments resolve (`/..//host`, `/%2e%2e//host` → `//host`), so the result is checked too.
 */
export function safeNext(next: unknown): string | undefined {
	// Browsers read `\` as `/` and drop tabs and newlines, so neither may reach the parser.
	if (typeof next !== 'string' || !next.startsWith('/') || /[\\\p{Cc}]/u.test(next)) return undefined;
	const base = new URL('https://next.invalid');
	try {
		const url = new URL(next, base);
		return url.origin === base.origin && !url.pathname.startsWith('//') ? url.pathname + url.search : undefined;
	} catch {
		return undefined;
	}
}

/** How long a reset link's session may set a new password without the old one. */
const RECOVERY_SECONDS = 3600;

/**
 * The email of a password-recovery session, else null: GoTrue marks the session a reset link signed in with the
 * `recovery` amr (PKCE code) or `otp` (token hash, verifyOtp), both checked against local Supabase, so the
 * new-password form needs that link, not a client flag. Web has no other email-code sign-in, and either proves control
 * of the address, which is all a reset asks. Read from the signature-checked claims.
 */
export async function recoveryEmail(): Promise<string | null> {
	const claims = await verifiedClaims();
	const now = Date.now() / 1000;
	const recovered = claims?.amr?.some(
		(entry) =>
			typeof entry === 'object' &&
			(entry.method === 'recovery' || entry.method === 'otp') &&
			now - entry.timestamp < RECOVERY_SECONDS
	);
	return recovered ? (claims?.email ?? '') : null;
}
