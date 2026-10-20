import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { PaymentDetail } from '@/components/payments/payment-detail';
import { ContentPage } from '@/components/shell/page';
import { env } from '@/lib/env';
import { requireViewer } from '@/lib/viewer';

export async function generateMetadata({ params }: PageProps<'/[locale]/account/payments/[id]'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'payments' });
	return { title: t('detail_title'), robots: { index: false } };
}

/** P15 payment detail (/racun/placila/[id], CH-704), signed in, owner only (C13 GET /v1/me/payments/:id); no ad slot. */
export default async function AccountPaymentPage({ params }: PageProps<'/[locale]/account/payments/[id]'>) {
	const { locale, id } = await params;
	await requireViewer(locale);

	return (
		<ContentPage>
			<PaymentDetail id={id} testMode={env.APP_ENV !== 'production'} />
		</ContentPage>
	);
}
