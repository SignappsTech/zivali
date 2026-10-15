import type { Metadata } from 'next';
import { type Locale, useLocale } from 'next-intl';

import { ArticlePage } from '@/components/content/article';
import { howItWorks } from '@/content/pages/how-it-works';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/how-it-works'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const { seo, h1 } = howItWorks[locale];
	return pageMetadata(locale, '/how-it-works', 'how-it-works', { ...seo, heading: h1 });
}

/** T2 How it works (P3). */
export default function HowItWorksPage() {
	return <ArticlePage content={howItWorks[useLocale()]} href="/how-it-works" schema="WebPage" />;
}
