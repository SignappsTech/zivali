import { hasLocale } from 'next-intl';
import { type NextRequest, NextResponse } from 'next/server';

import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { isHandoff, safeNext } from '@/lib/viewer';

type Href = Parameters<typeof getPathname>[0]['href'];

/** The link's PKCE code, else a reset link's token hash, becomes the session cookies; false when neither works. */
async function sessionFromLink(code: string | null, tokenHash: string | null) {
	if (!code && !tokenHash) return false;
	const { auth } = await createClient();
	const { error } = code
		? await auth.exchangeCodeForSession(code)
		: await auth.verifyOtp({ type: 'recovery', token_hash: tokenHash! });
	return !error;
}

/**
 * Supabase Auth sends the browser here (lib/auth.ts callbackUrl) from the confirmation and reset emails and after
 * Google, with a PKCE `code` or an `error`. The code becomes the session cookies on the server, then:
 * - `recovery`: the new-password form (/reset-password checks the session's amr itself); a dead link goes to the
 *   reset form with "Povezava ne deluje več". The PKCE verifier lives only in the browser that asked, so a `code`
 *   works only there; a `token_hash` (verifyOtp) works on any device. The recovery template still sends the code
 *   ({{ .ConfirmationURL }}); its switch to the token hash is tracked in backlog/changes.md (TASK-9.3, C3);
 * - `signup`: the "E-naslov je potrjen" view (P16 M5). GoTrue confirms the address before it issues the code, so a
 *   link opened in another browser (no verifier there, no session) still counts; only an expired or used link fails.
 *   A converted finder's link whose `next` is the set-password form (lib/auth convertAnonymous) goes straight there;
 *   without the session (another browser) it is the plain view, and "Pozabljeno geslo?" sets the password. A link
 *   from a signed-out Publish (`next` with the report's `?handoff=`, C3) goes straight back to the report, which
 *   publishes the draft; in another browser the view says the draft waits in the browser where it was started;
 * - `oauth`: back to `next`; cancelled or failed, to sign-in with a quiet message.
 */
export async function GET(request: NextRequest, { params }: RouteContext<'/[locale]/auth/callback'>) {
	const requested = (await params).locale;
	const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
	const query = request.nextUrl.searchParams;
	const type = query.get('type');
	const failed = Boolean(query.get('error'));
	const code = failed ? null : query.get('code');
	const tokenHash = failed || type !== 'recovery' ? null : query.get('token_hash');
	const next = safeNext(query.get('next'));
	const exchanged = await sessionFromLink(code, tokenHash);
	// Redirects resolve on the validated app URL, never on the request Host.
	const go = (path: string) => NextResponse.redirect(new URL(path, env.NEXT_PUBLIC_APP_URL));
	const to = (href: Href) => go(getPathname({ locale, href }));

	switch (type) {
		case 'recovery':
			return to(exchanged ? '/reset-password' : { pathname: '/reset-password', query: { link: 'expired' } });
		case 'signup':
			// C7 §6: a converted finder whose password could not go with the address sets it in this fresh session;
			// C3: a report drafted signed out publishes itself in this session (TASK-114.4).
			if (
				exchanged &&
				next &&
				(next.startsWith(`${getPathname({ locale, href: '/reset-password' })}?set=1`) || isHandoff(next))
			)
				return go(next);
			return to({
				pathname: '/sign-in',
				query: code ? { confirmed: '1', ...(next && { next }) } : { link: 'expired' },
			});
		default:
			if (exchanged) return next ? go(next) : to('/');
			// Google: the user closed the consent screen (access_denied), or the exchange failed.
			return to({
				pathname: '/sign-in',
				query: {
					error: query.get('error') === 'access_denied' ? 'cancelled' : 'failed',
					...(next && { next }),
				},
			});
	}
}
