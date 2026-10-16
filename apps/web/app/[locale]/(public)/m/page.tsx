import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { ManagePage } from '@/components/manage/manage-page';
import { PageMessages } from '@/components/page-messages';
import { StoreProvider } from '@/components/store-provider';

export async function generateMetadata({ params }: PageProps<'/[locale]/m'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'report_found' });
	return { title: t('manage_title'), robots: { index: false, follow: false } };
}

/** P7 manage page (`/m#<token>`, `/en/m#<token>`, C7, C15): private, noindex, no ad slot. The token never reaches the server. */
export default async function Page({ params }: PageProps<'/[locale]/m'>) {
	const { auth, lifecycle, report_found } = await getMessages({ locale: (await params).locale as Locale });
	return (
		<PageMessages messages={{ auth, lifecycle, report_found }}>
			<StoreProvider>
				<ManagePage />
			</StoreProvider>
		</PageMessages>
	);
}
