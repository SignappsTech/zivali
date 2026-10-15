import type { User } from '@supabase/supabase-js';
import { type ReactNode, useEffect } from 'react';

import { useSession } from '@zivali/api/auth';
import { useUpdateMeMutation } from '@zivali/api/me';
import { I18nProvider } from '@/lib/i18n';

/** A name for a new profile: what the user typed at sign-up, else the one Google sent. */
function metadataName(user: User | undefined): string | undefined {
	const meta = user?.user_metadata ?? {};
	const name = [meta.display_name, meta.full_name, meta.name].find(
		(value) => typeof value === 'string' && value.trim()
	);
	return (name as string | undefined)?.trim().slice(0, 60);
}

/**
 * Feeds the signed-in (non-anonymous) user's profile locale to I18nProvider; must sit under the Redux Provider. A new
 * profile also gets its name here: the one typed at sign-up or sent by Google waits in user_metadata (lib/auth.ts).
 */
export function ProfileI18n({ children }: { children: ReactNode }) {
	const { me, session } = useSession();
	const [updateMe] = useUpdateMeMutation();
	const profile =
		me && !me.is_anonymous
			? { locale: me.locale, save: (locale: 'sl' | 'en') => updateMe({ locale }).unwrap() }
			: null;

	const pendingName = profile && !me?.display_name ? metadataName(session?.user) : undefined;
	useEffect(() => {
		if (pendingName) updateMe({ display_name: pendingName });
	}, [pendingName, updateMe]);

	return <I18nProvider profile={profile}>{children}</I18nProvider>;
}
