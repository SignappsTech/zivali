import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Dashboard } from '@/components/admin/dashboard';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('dash_title') }) } };
}

/** P19 dashboard, /admin and /en/admin: moderators and admins. */
export default function AdminDashboardPage() {
	return <Dashboard />;
}
