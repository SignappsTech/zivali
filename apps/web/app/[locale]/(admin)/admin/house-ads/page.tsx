import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { HouseAds } from '@/components/admin/ads/house-ads';
import { adPageProps } from '@/lib/admin-ads';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/house-ads'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('house_title') }) } };
}

/** P20 house ads (TASK-37.3), SL /admin/lastni-oglasi, EN /en/admin/house-ads. Admins only (nav.ts), aal2. */
export default async function HouseAdsPage({ params }: PageProps<'/[locale]/admin/house-ads'>) {
	return <HouseAds {...await adPageProps((await params).locale)} />;
}
