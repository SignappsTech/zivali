import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { NewAd } from '@/components/admin/ads/ad-form';
import { adPageProps } from '@/lib/admin-ads';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/ads/new'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('ads_new') }) } };
}

/** P20 new ad (TASK-37.3), SL /admin/oglasi/nov, EN /en/admin/ads/new; `?from=<id>` duplicates that ad. */
export default async function NewAdPage({ params, searchParams }: PageProps<'/[locale]/admin/ads/new'>) {
	const [{ locale }, { from }] = await Promise.all([params, searchParams]);
	return <NewAd from={typeof from === 'string' ? from : undefined} {...await adPageProps(locale)} />;
}
