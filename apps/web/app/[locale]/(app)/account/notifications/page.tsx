import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { NotificationSettings } from '@/components/notifications/notification-settings';
import { ContentPage, h1Class } from '@/components/shell/page';
import { requireViewer } from '@/lib/viewer';

export async function generateMetadata({ params }: PageProps<'/[locale]/account/notifications'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'notifications' });
	return { title: t('title'), robots: { index: false } };
}

/** Notification settings (`/racun/obvestila`, `/en/account/notifications`, C15): a real account only, as /account. */
export default async function AccountNotificationsPage({ params }: PageProps<'/[locale]/account/notifications'>) {
	const { locale } = await params;
	await requireViewer(locale);
	const t = await getTranslations({ locale: locale as Locale, namespace: 'notifications' });

	return (
		<ContentPage>
			<h1 className={h1Class}>{t('title')}</h1>
			<NotificationSettings />
		</ContentPage>
	);
}
