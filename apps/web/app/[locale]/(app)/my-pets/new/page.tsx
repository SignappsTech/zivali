import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { PetForm } from '@/components/pets/pet-form';
import { ContentPage } from '@/components/shell/page';

export async function generateMetadata({ params }: PageProps<'/[locale]/my-pets/new'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'pets' });
	return { title: t('new_title'), robots: { index: false } };
}

/** P8 add a pet (/moje-zivali/nova). */
export default function NewPetPage() {
	return (
		<ContentPage>
			<PetForm />
		</ContentPage>
	);
}
