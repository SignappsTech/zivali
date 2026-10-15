import type { Locale } from 'next-intl';

import { LegalPage, legalMetadata } from '@/components/legal/legal-page';

export async function generateMetadata({ params }: PageProps<'/[locale]/terms'>) {
	return legalMetadata((await params).locale as Locale, 'terms');
}

export default async function Page({ params }: PageProps<'/[locale]/terms'>) {
	return <LegalPage locale={(await params).locale as Locale} slug="terms" />;
}
