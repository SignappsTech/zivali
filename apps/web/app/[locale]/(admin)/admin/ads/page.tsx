import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AdsAdmin } from '@/components/admin/ads/ads-admin';
import { adPageProps } from '@/lib/admin-ads';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/ads'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('ads_title') }) } };
}

/** P20 ads list (TASK-37.3), SL /admin/oglasi, EN /en/admin/ads. Admins only (nav.ts), aal2 (C3, C14). */
export default async function AdsPage({ params }: PageProps<'/[locale]/admin/ads'>) {
	const { regions } = await adPageProps((await params).locale);
	return <AdsAdmin regions={regions} />;
}
