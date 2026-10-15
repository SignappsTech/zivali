import { hasLocale } from 'next-intl';
import { type NextRequest, NextResponse } from 'next/server';

import { getPathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { env } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { safeNext } from '@/lib/viewer';

type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * Supabase Auth sends the browser here (lib/auth.ts callbackUrl) from the confirmation and reset emails and after
 * Google, with a PKCE `code` or an `error`. The code becomes the session cookies on the server, then:
 * - `recovery`: the new-password form (/reset-password checks the session's `recovery` amr itself); a dead link goes
 *   to the reset form with "Povezava ne deluje več";
 * - `signup`: the "E-naslov je potrjen" view (P16 M5). GoTrue confirms the address before it issues the code, so a
 *   link opened in another browser (no verifier there, no session) still counts; only an expired or used link fails;
 * - `oauth`: back to `next`; cancelled or failed, to sign-in with a quiet message.
 */
export async function GET(request: NextRequest, { params }: RouteContext<'/[locale]/auth/callback'>) {
	const requested = (await params).locale;
	const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
	const query = request.nextUrl.searchParams;
	const code = query.get('error') ? null : query.get('code');
	const next = safeNext(query.get('next'));
	const exchanged = code ? !(await (await createClient()).auth.exchangeCodeForSession(code)).error : false;
	// Redirects resolve on the validated app URL, never on the request Host.
	const go = (path: string) => NextResponse.redirect(new URL(path, env.NEXT_PUBLIC_APP_URL));
	const to = (href: Href) => go(getPathname({ locale, href }));

	switch (query.get('type')) {
		case 'recovery':
			return to(exchanged ? '/reset-password' : { pathname: '/reset-password', query: { link: 'expired' } });
		case 'signup':
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
