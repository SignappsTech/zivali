import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AbuseReports } from '@/components/admin/abuse-reports';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/abuse-reports'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('nav_abuse') }) } };
}

/** P19 abuse reports and moderation flags (TASK-25.5), SL /admin/prijave-zlorab, EN /en/admin/abuse-reports: staff, aal2 (C11). */
export default function AbuseReportsPage() {
	return <AbuseReports />;
}
