import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { ShortCode } from '@zivali/validation/common.schema';
import { MyReports, type ReportAction } from '@/components/report/my-reports';
import { ContentPage } from '@/components/shell/page';
import { Toaster } from '@/components/ui/sonner';

type Props = PageProps<'/[locale]/my-reports'>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'pets' });
	return { title: t('my_reports'), robots: { index: false } };
}

const ACTIONS = new Set<string>(['keep', 'extend', 'close']);

/**
 * My reports (C15 /moje-prijave: accounts and manage-link sessions; the group's layout has checked the session), also
 * the C10 target of reminder and expiry links (`?r=<code>&action=keep|extend|close`).
 */
export default async function MyReportsPage({ params, searchParams }: Props) {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'common' });
	const { r, action } = await searchParams;
	// The code goes into an API path unencoded: only a C1 short code gets that far.
	const code = ShortCode.safeParse(r);
	const deepLink =
		code.success && typeof action === 'string' && ACTIONS.has(action)
			? ({ code: code.data, action } as ReportAction)
			: undefined;
	return (
		<ContentPage>
			<div className="max-w-[720px]">
				<MyReports deepLink={deepLink} />
			</div>
			<Toaster closeLabel={t('close')} label={t('toasts_label')} />
		</ContentPage>
	);
}
