import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AdminGate } from '@/components/admin/admin-gate';
import { DirectoryAdmin } from '@/components/admin/directory/directory-admin';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/shelters'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return {
		title: { absolute: t('doc_title', { page: t('directory.title') }) },
		robots: { index: false, follow: false },
	};
}

/** P19 shelter directory (TASK-89.2), SL /admin/zavetisca, EN /en/admin/shelters. Admins only, aal2 (C3, C18). */
export default function ShelterDirectoryPage() {
	return (
		// TODO(TASK-34.3): the admin shell (sidebar, top bar, skip link) wraps this page and owns the main landmark.
		<main id="main" className="mx-auto w-full max-w-[1280px] px-5 pt-6 pb-16 lg:px-12">
			<AdminGate require={{ role: 'ADMIN', aal2: true }}>
				<DirectoryAdmin />
			</AdminGate>
		</main>
	);
}
