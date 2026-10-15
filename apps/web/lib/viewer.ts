import type { Locale } from 'next-intl';
import { cache } from 'react';

import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';

export type Viewer = { initials: string };

/**
 * The signed-in user for the shell and the route group guards, read from the session cookie (refreshed by proxy.ts)
 * without verifying it: UX only, the API and RLS enforce access (C15). Server-side, so signed-out pages ship no
 * supabase-js. An anonymous finder session (C7) counts as signed out.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
	const { data } = await (await createClient()).auth.getSession();
	const token = data.session?.access_token;
	if (!token) return null;
	try {
		const claims = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
		if (claims.is_anonymous) return null;
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
	} catch {
		return null;
	}
});

/** Server guard of the (app), (admin) and (portal) layouts: signed-out visitors go to sign-in. */
export async function requireViewer(locale: string): Promise<Viewer> {
	const viewer = await getViewer();
	// TODO(TASK-9.3): send the page along as `next`, as AdminGate does.
	return viewer ?? redirect({ href: '/sign-in', locale: locale as Locale });
}
