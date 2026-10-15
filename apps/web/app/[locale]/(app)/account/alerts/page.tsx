import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { VerifiedOnly } from '@/components/auth/gate';
import { ContentPage, Placeholder } from '@/components/shell/page';
import { requireViewer } from '@/lib/viewer';

export async function generateMetadata({ params }: PageProps<'/[locale]/account/alerts'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'nav' });
	return { title: t('account_alerts'), robots: { index: false } };
}

/** Nearby alerts (C15), signed in with a confirmed address (FR-001). TODO(TASK-23.2): the alert settings. */
export default async function AccountAlertsPage({ params }: PageProps<'/[locale]/account/alerts'>) {
	const { locale } = await params;
	await requireViewer(locale);
	const t = await getTranslations({ locale: locale as Locale, namespace: 'nav' });

	return (
		<ContentPage>
			<VerifiedOnly>
				<Placeholder title={t('account_alerts')} />
			</VerifiedOnly>
		</ContentPage>
	);
}
