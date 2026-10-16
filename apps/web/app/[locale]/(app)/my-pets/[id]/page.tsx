import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { PetDetailById } from '@/components/pets/pet-detail';
import { ContentPage } from '@/components/shell/page';

export async function generateMetadata({ params }: PageProps<'/[locale]/my-pets/[id]'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'pets' });
	return { title: t('title'), robots: { index: false } };
}

/** P8 pet detail (/moje-zivali/[id]), owner only: the API answers anyone else's pet with FORBIDDEN, shown as 404. */
export default async function PetPage({ params }: PageProps<'/[locale]/my-pets/[id]'>) {
	return (
		<ContentPage>
			<PetDetailById id={(await params).id} />
		</ContentPage>
	);
}
