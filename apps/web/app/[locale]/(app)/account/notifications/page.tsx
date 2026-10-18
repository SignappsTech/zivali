import type { Locale } from 'next-intl';
import { redirect } from 'next/navigation';

import { getPathname } from '@/i18n/navigation';
import { requireViewer } from '@/lib/viewer';

/**
 * The old notification settings URL (`/racun/obvestila`, `/en/account/notifications`, the emails' "manage
 * notifications" link): "Kako vas obvestimo" is a section of the alerts page now (TASK-114.15), and its anchor opens
 * it. Sign-in comes first, so a signed-out visitor comes back here and still lands on the open section. The target is
 * fixed: the alerts path of the locale and the section's anchor, nothing from the request.
 */
export default async function AccountNotificationsPage({ params }: PageProps<'/[locale]/account/notifications'>) {
	const locale = (await params).locale as Locale;
	await requireViewer(locale);
	redirect(`${getPathname({ locale, href: '/account/alerts' })}#kako-vas-obvestimo`);
}
