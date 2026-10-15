import type { Metadata } from 'next';
import { type Locale, useTranslations } from 'next-intl';

import { ContentPage, h1Class } from '@/components/shell/page';
import { absoluteUrl } from '@/lib/seo';

// Title and description are the layout defaults (P1 content slice §7).
export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
	return { alternates: { canonical: absoluteUrl((await params).locale as Locale, '/') } };
}

// Sample page for the scaffold; the real home page is TASK-27.2. The sidebar region is reserved for the ad slot (C15).
export default function HomePage() {
	const t = useTranslations('pages.home');

	return (
		<ContentPage sidebar>
			<h1 className={h1Class}>{t('hero_title')}</h1>
			<p className="mt-4 max-w-[58ch] text-lg text-muted-foreground lg:text-xl">{t('hero_lede')}</p>
		</ContentPage>
	);
}
