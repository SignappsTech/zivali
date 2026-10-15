import type { Metadata } from 'next';
import { type Locale, useLocale } from 'next-intl';

import { FaqPage } from '@/components/content/article';
import { faq } from '@/content/pages/faq';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: PageProps<'/[locale]/faq'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const { seo, h1 } = faq[locale];
	return pageMetadata(locale, '/faq', 'faq', { ...seo, heading: h1 });
}

/** T3 FAQ (P3) with FAQPage structured data. */
export default function Faq() {
	return <FaqPage content={faq[useLocale()]} href="/faq" />;
}
