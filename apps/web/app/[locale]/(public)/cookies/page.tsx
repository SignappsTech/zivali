import type { Locale } from 'next-intl';

import { LegalPage, legalMetadata } from '@/components/legal/legal-page';

export async function generateMetadata({ params }: PageProps<'/[locale]/cookies'>) {
	return legalMetadata((await params).locale as Locale, 'cookies');
}

export default async function Page({ params }: PageProps<'/[locale]/cookies'>) {
	return <LegalPage locale={(await params).locale as Locale} slug="cookies" />;
}
