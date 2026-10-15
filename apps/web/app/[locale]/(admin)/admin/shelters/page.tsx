import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { DirectoryAdmin } from '@/components/admin/directory/directory-admin';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/shelters'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('directory.title') }) } };
}

/** P19 shelter directory (TASK-89.2), SL /admin/zavetisca, EN /en/admin/shelters. Admins only (nav.ts), aal2 (C3, C18). */
export default function ShelterDirectoryPage() {
	return <DirectoryAdmin />;
}
