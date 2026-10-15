import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { ContentPage, Placeholder } from '@/components/shell/page';

export async function generateMetadata({ params }: PageProps<'/[locale]/my-pets'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'nav' });
	return { title: t('my_pets_reports'), robots: { index: false } };
}

/** Target of the signed-in header link "Moje živali in prijave". TODO(TASK-16.6): the My pets list. */
export default async function MyPetsPage({ params }: PageProps<'/[locale]/my-pets'>) {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'nav' });

	return (
		<ContentPage>
			<Placeholder title={t('my_pets_reports')} />
		</ContentPage>
	);
}
