import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { PaymentsList } from '@/components/payments/payments-list';
import { ContentPage, h1Class } from '@/components/shell/page';
import { requireViewer } from '@/lib/viewer';

export async function generateMetadata({ params }: PageProps<'/[locale]/account/payments'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'payments' });
	return { title: t('list_title'), robots: { index: false } };
}

/** My payments (P15 W3, C15 /racun/placila), signed in: the user's own payments (C13 GET /v1/me/payments). */
export default async function AccountPaymentsPage({ params }: PageProps<'/[locale]/account/payments'>) {
	const { locale } = await params;
	await requireViewer(locale);
	const t = await getTranslations({ locale: locale as Locale, namespace: 'payments' });

	return (
		<ContentPage>
			<div className="mx-auto max-w-[640px]">
				<h1 className={h1Class}>{t('list_title')}</h1>
				<PaymentsList />
			</div>
		</ContentPage>
	);
}
