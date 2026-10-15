import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { AuditLog } from '@/components/admin/audit-log';

export async function generateMetadata({ params }: PageProps<'/[locale]/admin/audit-log'>): Promise<Metadata> {
	const { locale } = await params;
	const t = await getTranslations({ locale: locale === 'en' ? 'en' : 'sl', namespace: 'admin' });
	return { title: { absolute: t('doc_title', { page: t('audit_title') }) } };
}

/** P19 audit log, SL /admin/revizijska-sled, EN /en/admin/audit-log: admins (C3). */
export default function AuditLogPage() {
	return <AuditLog />;
}
