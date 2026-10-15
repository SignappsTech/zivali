import type { Locale } from 'next-intl';

import { LegalPage, legalMetadata } from '@/components/legal/legal-page';

export async function generateMetadata({ params }: PageProps<'/[locale]/accessibility'>) {
	return legalMetadata((await params).locale as Locale, 'accessibility');
}

export default async function Page({ params }: PageProps<'/[locale]/accessibility'>) {
	return <LegalPage locale={(await params).locale as Locale} slug="accessibility" />;
}
