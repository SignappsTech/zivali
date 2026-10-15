import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { ContentPage, Placeholder } from '@/components/shell/page';

export async function generateMetadata({ params }: PageProps<'/[locale]/portal'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'common' });
	return { title: t('portal_title'), robots: { index: false, follow: false } };
}

/** Placeholder of the shelter and organisation portal (M3, P19). */
export default async function PortalPage({ params }: PageProps<'/[locale]/portal'>) {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'common' });

	return (
		<ContentPage>
			<Placeholder title={t('portal_title')} />
		</ContentPage>
	);
}
