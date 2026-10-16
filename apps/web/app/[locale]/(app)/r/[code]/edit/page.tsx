import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { EditReport } from '@/components/report/edit-report';
import { ContentPage } from '@/components/shell/page';
import { redirect } from '@/i18n/navigation';
import { getReport } from '@/lib/report';

type Props = PageProps<'/[locale]/r/[code]/edit'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'report_found' });
	return { title: t('manage_edit'), robots: { index: false } };
}

/**
 * "Uredi" (P9 owner actions, the /m page's "Uredi prijavo"; C15 /r/[code]/uredi, group `app`): managers of an open
 * search only, the signed-in owner or the manage-link session. Anyone else, or an ended report, goes to the report.
 */
export default async function EditReportPage({ params }: Props) {
	const { locale: raw, code } = await params;
	const locale = raw as Locale;
	const result = await getReport(locale, code);
	const report = result && 'report' in result ? result.report : undefined;
	if (!report?.is_mine || (report.status !== 'open' && report.status !== 'matched'))
		return redirect({ href: { pathname: '/r/[code]', params: { code } }, locale });
	return (
		<ContentPage>
			<div className="max-w-[640px]">
				<EditReport report={report} />
			</div>
		</ContentPage>
	);
}
