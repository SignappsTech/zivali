import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { AlertSettings } from '@/components/alerts/alert-settings';
import { ContentPage, h1Class } from '@/components/shell/page';
import { requireViewer } from '@/lib/viewer';

export async function generateMetadata({ params }: PageProps<'/[locale]/account/alerts'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'nav' });
	return { title: t('account_alerts'), robots: { index: false } };
}

/**
 * Nearby alerts (`/racun/opozorila`, `/en/account/alerts`, C15), a real account only. Turning them on needs a confirmed
 * address (FR-001): the switch opens the P16 gate's "Potrdite svoj e-naslov" for an unconfirmed one.
 */
export default async function AccountAlertsPage({ params }: PageProps<'/[locale]/account/alerts'>) {
	const { locale } = await params;
	await requireViewer(locale);
	const t = await getTranslations({ locale: locale as Locale, namespace: 'alerts' });

	return (
		<ContentPage>
			<h1 className={h1Class}>{t('title')}</h1>
			<AlertSettings />
		</ContentPage>
	);
}
