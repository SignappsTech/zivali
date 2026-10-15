import type { Locale } from 'next-intl';

import { LegalPage, legalMetadata } from '@/components/legal/legal-page';

export async function generateMetadata({ params }: PageProps<'/[locale]/imprint'>) {
	return legalMetadata((await params).locale as Locale, 'imprint');
}

export default async function Page({ params }: PageProps<'/[locale]/imprint'>) {
	return <LegalPage locale={(await params).locale as Locale} slug="imprint" />;
}
