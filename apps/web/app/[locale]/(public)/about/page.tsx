import type { Metadata } from 'next';
import { type Locale, useLocale } from 'next-intl';

import { ArticlePage } from '@/components/content/article';
import { about } from '@/content/pages/about';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/about'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const { seo, h1 } = about[locale];
	return pageMetadata(locale, '/about', 'about', { ...seo, heading: h1 });
}

/** T2 About (P3). */
export default function AboutPage() {
	return <ArticlePage content={about[useLocale()]} href="/about" schema="AboutPage" />;
}
