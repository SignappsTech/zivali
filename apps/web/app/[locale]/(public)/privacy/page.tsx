import type { Locale } from 'next-intl';

import { LegalPage, legalMetadata } from '@/components/legal/legal-page';

export async function generateMetadata({ params }: PageProps<'/[locale]/privacy'>) {
	return legalMetadata((await params).locale as Locale, 'privacy');
}

export default async function Page({ params }: PageProps<'/[locale]/privacy'>) {
	return <LegalPage locale={(await params).locale as Locale} slug="privacy" />;
}
