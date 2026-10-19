import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Enquiries } from '@/components/admin/enquiries';
import { regionOptions } from '@/lib/partners';

const lang = (locale: string) => (locale === 'en' ? 'en' : 'sl');

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/enquiries'>): Promise<Metadata> {
	const t = await getTranslations({ locale: lang((await params).locale), namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('leads_title') }) } };
}

/** P19 Enquiries (TASK-34.10), SL /admin/povprasevanja, EN /en/admin/enquiries: admins only (nav.ts), aal2 (C14). */
export default async function EnquiriesPage({ params }: PageProps<'/[locale]/admin/enquiries'>) {
	const locale = lang((await params).locale);
	return <Enquiries regions={Object.fromEntries(regionOptions(locale).map(({ slug, name }) => [slug, name]))} />;
}
