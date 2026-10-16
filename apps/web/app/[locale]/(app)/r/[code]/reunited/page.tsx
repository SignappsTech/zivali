import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { Reunited } from '@/components/report/reunited';
import { redirect } from '@/i18n/navigation';
import { getReport } from '@/lib/report';
import { getViewer } from '@/lib/viewer';

type Props = PageProps<'/[locale]/r/[code]/reunited'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'browse' });
	return { title: t('status_reunited'), robots: { index: false } };
}

/**
 * P14 reunited page (C15 /r/[code]/spet-doma, /en/r/[code]/reunited; group `app`, managers): where "Žival je spet
 * doma" lands. Anyone else, or a report reopened meanwhile, goes to the report page.
 */
export default async function ReunitedPage({ params }: Props) {
	const { locale: raw, code } = await params;
	const locale = raw as Locale;
	const result = await getReport(locale, code);
	const report = result && 'report' in result ? result.report : undefined;
	if (!report?.is_mine || report.status !== 'reunited')
		return redirect({ href: { pathname: '/r/[code]', params: { code } }, locale });
	// The group's guard has verified the session; no viewer means the anonymous manage-link session (C7).
	return <Reunited report={report} anonymous={!(await getViewer())} />;
}
