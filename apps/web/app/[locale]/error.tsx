'use client';

import { useTranslations } from 'next-intl';

import { ContentPage, ErrorPage } from '@/components/shell/page';

/** P1 500 for a page that failed to render; header and footer stay. "Poskusi znova" renders the page again. */
export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
	const t = useTranslations('errors');

	return (
		<ContentPage>
			<title>{`${t('page_500_doc_title')} · Najdimo`}</title>
			<ErrorPage status={500} onRetry={reset} />
		</ContentPage>
	);
}
