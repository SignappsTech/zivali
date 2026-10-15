import type { Locale } from 'next-intl';
import { headers } from 'next/headers';
import { cache } from 'react';

import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

export type Viewer = { initials: string };

/**
 * The signed-in user for the shell and the route group guards, read from the session cookie (refreshed by proxy.ts)
 * without verifying it: UX only, the guards use requireViewer and the API and RLS enforce access (C15). Server-side, so signed-out pages ship no
 * supabase-js. An anonymous finder session (C7) counts as signed out.
 */
const toViewer = (claims: { email?: string; user_metadata?: { full_name?: string; name?: string } }): Viewer => {
	// The user's own name or email, shown only to them as avatar initials: "ana.novak@…" → "AN".
	const { full_name, name } = claims.user_metadata ?? {};
	const words = String(full_name || name || claims.email?.split('@')[0] || '')
		.split(/[\s._-]+/)
		.filter(Boolean);
	return {
		initials: words
			.slice(0, 2)
			.map((word) => word[0]!.toUpperCase())
			.join(''),
	};
};

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

/**
 * Server guard of the (app), (admin) and (portal) layouts and the account pages: visitors without a verified session
 * go to sign-in, with the page they asked for as `next` (the proxy's x-next-path), so they come back to it.
 * `getClaims()` checks the signature (against the project JWKS, or via getUser for HS256), unlike getViewer.
 * Anonymous sessions (C7, C15 report managers coming in through /m) pass only with `allowAnonymous`.
 */
export async function requireViewer(locale: string, { allowAnonymous = false } = {}): Promise<Viewer> {
	const { data } = await (await createClient()).auth.getClaims();
	const claims = data?.claims;
	if (claims && (allowAnonymous || !claims.is_anonymous)) return toViewer(claims);
	const next = (await headers()).get('x-next-path');
	return redirect({
		href: next ? { pathname: '/sign-in', query: { next } } : '/sign-in',
		locale: locale as Locale,
	});
}

/**
 * A same-site path to return to after sign-in, or undefined: the `next` query param is user input, so only a path on
 * this origin passes (no `//host` or `/\host`, no scheme). Returns pathname and search.
 */
export function safeNext(next: unknown): string | undefined {
	if (typeof next !== 'string' || !next.startsWith('/')) return undefined;
	const base = 'https://next.invalid';
	const url = new URL(next, base);
	return url.origin === base ? url.pathname + url.search : undefined;
}

/** How long a reset link's session may set a new password without the old one. */
const RECOVERY_SECONDS = 3600;

/**
 * The email of a password-recovery session, else null: GoTrue marks the session the reset link's code was exchanged
 * for with the `recovery` amr (checked against local Supabase), so the new-password form needs that link, not a
 * client flag. Read from the signature-checked claims.
 */
export async function recoveryEmail(): Promise<string | null> {
	const { data } = await (await createClient()).auth.getClaims();
	const claims = data?.claims;
	const now = Date.now() / 1000;
	const recovered = claims?.amr?.some(
		(entry) => typeof entry === 'object' && entry.method === 'recovery' && now - entry.timestamp < RECOVERY_SECONDS
	);
	return recovered ? (claims?.email ?? '') : null;
}
