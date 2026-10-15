import type { Metadata } from 'next';
import { type Locale, useLocale } from 'next-intl';

import { ArticlePage } from '@/components/content/article';
import { safety } from '@/content/pages/safety';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/safety'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const { seo, h1 } = safety[locale];
	return pageMetadata(locale, '/safety', 'safety', { ...seo, heading: h1 });
}

/** T2 Safety tips (P3); schema.org Article (datePublished follows at launch). */
export default function SafetyPage() {
	return <ArticlePage content={safety[useLocale()]} href="/safety" schema="Article" />;
}
