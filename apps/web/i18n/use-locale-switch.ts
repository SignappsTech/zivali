import { type Locale, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * The signed-in side of the switch, set by useProfileLocale (use-profile-locale.ts) while SessionSync runs: it saves
 * the profile locale. Signed-out pages leave it empty, so the switch (in every page's header and footer) ships no Redux
 * (TASK-90.5).
 */
export const profileLocale: { save?: (next: Locale) => Promise<unknown> } = {};

/**
 * The language switch (FR-036, C16): `switchLocale('en')` opens the same page in English and next-intl writes the
 * NEXT_LOCALE cookie. A signed-in user's profile locale is saved first, since emails and push use it.
 */
export function useLocaleSwitch() {
	const locale = useLocale();
	const pathname = usePathname();
	const params = useParams();
	const router = useRouter();

	const open = useCallback(
		(next: Locale) =>
			// The query string is dropped on purpose (accepted in review); only pathname and params carry over.
			// @ts-expect-error -- params always belong to the current pathname (next-intl locale switcher pattern).
			router.replace({ pathname, params }, { locale: next }),
		[router, pathname, params]
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
