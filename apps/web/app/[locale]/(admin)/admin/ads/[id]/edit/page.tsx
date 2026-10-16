import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { EditAd } from '@/components/admin/ads/ad-form';
import { adPageProps } from '@/lib/admin-ads';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/ads/[id]/edit'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('ads_title') }) } };
}

/** P20 edit (TASK-37.3), SL /admin/oglasi/[id]/uredi, EN /en/admin/ads/[id]/edit. */
export default async function EditAdPage({ params }: PageProps<'/[locale]/admin/ads/[id]/edit'>) {
	const { locale, id } = await params;
	return <EditAd id={id} {...await adPageProps(locale)} />;
}
