import type { Metadata } from 'next';
import { type Locale, useLocale } from 'next-intl';

import { ArticlePage } from '@/components/content/article';
import { forShelters } from '@/content/pages/for-shelters';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/for-shelters'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const { seo, h1 } = forShelters[locale];
	return pageMetadata(locale, '/for-shelters', 'for-shelters', { ...seo, heading: h1 });
}

/** T2 For shelters, vets and municipalities (P3). */
export default function ForSheltersPage() {
	return <ArticlePage content={forShelters[useLocale()]} href="/for-shelters" schema="WebPage" />;
}
