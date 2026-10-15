import { type Locale, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { useSession } from '@zivali/api/auth';
import { useUpdateMeMutation } from '@zivali/api/me';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * The language switch (FR-036, C16): `switchLocale('en')` opens the same page in English and next-intl writes the
 * NEXT_LOCALE cookie. A signed-in user's profile locale is saved first, since emails and push use it. After a sign-in
 * in this tab the profile locale wins: the page moves to that language.
 */
export function useLocaleSwitch() {
	const locale = useLocale();
	const pathname = usePathname();
	const params = useParams();
	const router = useRouter();
	const { session, me, loading } = useSession();
	const [updateMe] = useUpdateMeMutation();

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
			if (me && me.locale !== next) await updateMe({ locale: next });
			open(next);
		},
		[locale, me, updateMe, open]
	);

	const wasSignedOut = useRef(false);
	useEffect(() => {
		if (loading) return;
		if (!session) wasSignedOut.current = true;
		else if (wasSignedOut.current && me && !me.is_anonymous) {
			wasSignedOut.current = false;
			if (me.locale !== locale) open(me.locale);
		}
	}, [loading, session, me, locale, open]);

	return { locale, switchLocale };
}
