import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ComingSoon } from '@/components/admin/directory/parts';
import { comingSection } from '@/components/admin/nav';

const translations = (locale: string) => getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/[section]'>): Promise<Metadata> {
	const { locale, section } = await params;
	const item = comingSection(section);
	const t = await translations(locale);
	return item ? { title: { absolute: t('doc_title', { page: t(item.key) }) } } : {};
}

/** P19 S2: a sidebar section whose page is not built yet; any other /admin/… path is a 404. */
export default async function ComingSectionPage({ params }: PageProps<'/[locale]/admin/[section]'>) {
	const { locale, section } = await params;
	const item = comingSection(section);
	if (!item) notFound();
	const t = await translations(locale);
	return <ComingSoon title={t(item.key)} />;
}
