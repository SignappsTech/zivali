import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { ContentPage, Placeholder } from '@/components/shell/page';
import { requireViewer } from '@/lib/viewer';

export async function generateMetadata({ params }: PageProps<'/[locale]/account/payments'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'nav' });
	return { title: t('account_payments'), robots: { index: false } };
}

/** Account payments (C15), signed in. TODO(TASK-32.2): My payments. */
export default async function AccountPaymentsPage({ params }: PageProps<'/[locale]/account/payments'>) {
	const { locale } = await params;
	await requireViewer(locale);
	const t = await getTranslations({ locale: locale as Locale, namespace: 'nav' });

	return (
		<ContentPage>
			<Placeholder title={t('account_payments')} />
		</ContentPage>
	);
}
