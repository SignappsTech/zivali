import type { Locale } from 'next-intl';
import { useEffect, useRef } from 'react';

import { useSession } from '@zivali/api/auth';
import { useUpdateMeMutation } from '@zivali/api/me';

import { profileLocale, useLocaleSwitch } from './use-locale-switch';

/**
 * The profile side of the language switch (FR-036), for SessionSync on signed-in pages: the switch saves a changed
 * profile locale first, and after a sign-in in this tab the profile locale wins (the page moves to that language).
 */
export function useProfileLocale() {
	const { locale, open } = useLocaleSwitch();
	const { session, me, loading } = useSession();
	const [updateMe] = useUpdateMeMutation();

	useEffect(() => {
		const save = async (next: Locale) => {
			if (me && me.locale !== next) await updateMe({ locale: next });
		};
		profileLocale.save = save;
		return () => {
			if (profileLocale.save === save) profileLocale.save = undefined;
		};
	}, [me, updateMe]);

	const wasSignedOut = useRef(false);
	useEffect(() => {
		if (loading) return;
		if (!session) wasSignedOut.current = true;
		else if (wasSignedOut.current && me && !me.is_anonymous) {
			wasSignedOut.current = false;
			if (me.locale !== locale) open(me.locale);
		}
	}, [loading, session, me, locale, open]);
}
