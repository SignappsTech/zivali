import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AdDetail } from '@/components/admin/ads/ad-detail';
import { adPageProps } from '@/lib/admin-ads';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/ads/[id]'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('ads_title') }) } };
}

/** P20 ad detail with statistics and history (TASK-37.3), SL /admin/oglasi/[id], EN /en/admin/ads/[id]. */
export default async function AdDetailPage({ params }: PageProps<'/[locale]/admin/ads/[id]'>) {
	const { locale, id } = await params;
	const { regions } = await adPageProps(locale);
	return <AdDetail id={id} regions={regions} />;
}
