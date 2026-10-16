import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { PetList } from '@/components/pets/pet-list';
import { ContentPage } from '@/components/shell/page';

export async function generateMetadata({ params }: PageProps<'/[locale]/my-pets'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'pets' });
	return { title: t('title'), robots: { index: false } };
}

/** P8 My pets (C15 /moje-zivali), the target of the signed-in header link; the layout has checked the account. */
export default function MyPetsPage() {
	return (
		<ContentPage>
			<div className="max-w-[720px]">
				<PetList />
			</div>
		</ContentPage>
	);
}
