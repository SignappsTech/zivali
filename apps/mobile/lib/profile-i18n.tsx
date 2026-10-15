import type { ReactNode } from 'react';

import { useSession } from '@zivali/api/auth';
import { useUpdateMeMutation } from '@zivali/api/me';
import { I18nProvider } from '@/lib/i18n';

/** Feeds the signed-in (non-anonymous) user's profile locale to I18nProvider; must sit under the Redux Provider. */
export function ProfileI18n({ children }: { children: ReactNode }) {
	const { me } = useSession();
	const [updateMe] = useUpdateMeMutation();
	const profile =
		me && !me.is_anonymous
			? { locale: me.locale, save: (locale: 'sl' | 'en') => updateMe({ locale }).unwrap() }
			: null;
	return <I18nProvider profile={profile}>{children}</I18nProvider>;
}
