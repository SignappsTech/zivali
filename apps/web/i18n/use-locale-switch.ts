import type { Locale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { useRoute } from './client-navigation';
import { localisedPath, syncLocaleCookie } from './route';

/**
 * The signed-in side of the switch, set by useProfileLocale (use-profile-locale.ts) while SessionSync runs: it saves
 * the profile locale. Signed-out pages leave it empty, so the switch (in every page's header and footer) ships no Redux
 * (TASK-90.5).
 */
export const profileLocale: { save?: (next: Locale) => Promise<unknown> } = {};

/**
 * The language switch (FR-036, C16): `switchLocale('en')` opens the same page in English and writes the NEXT_LOCALE
 * cookie, as next-intl's `router.replace(href, { locale })` does, without its client runtime (./route.ts). A signed-in
 * user's profile locale is saved first, since emails and push use it.
 */
export function useLocaleSwitch() {
	const { locale, pathname, params } = useRoute();
	const router = useRouter();

	const open = useCallback(
		(next: Locale) => {
			syncLocaleCookie(locale, next);
			// Always prefixed, so the proxy redirects /sl/… to the unprefixed SL path. The query string is dropped on
			// purpose (accepted in review); only pathname and params carry over.
			router.replace(localisedPath({ locale: next, href: { pathname, params }, forcePrefix: true }));
		},
		[router, locale, pathname, params]
	);

	const switchLocale = useCallback(
		async (next: Locale) => {
			if (next === locale) return;
			// Awaited: the switch may reload the page, which would cancel the request. A failed save still switches.
			await profileLocale.save?.(next);
			open(next);
		},
		[locale, open]
	);

	return { locale, switchLocale, open };
}
