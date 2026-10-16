import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { PetEditById } from '@/components/pets/pet-form';
import { ContentPage } from '@/components/shell/page';

export async function generateMetadata({ params }: PageProps<'/[locale]/my-pets/[id]/edit'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'pets' });
	return { title: t('edit_title'), robots: { index: false } };
}

/** P8 edit a pet (/moje-zivali/[id]/uredi). */
export default async function EditPetPage({ params }: PageProps<'/[locale]/my-pets/[id]/edit'>) {
	return (
		<ContentPage>
			<PetEditById id={(await params).id} />
		</ContentPage>
	);
}
