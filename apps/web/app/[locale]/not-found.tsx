import { useTranslations } from 'next-intl';

import { ContentPage, ErrorPage } from '@/components/shell/page';

/** P1 404 for every page under a locale, inside the shell; Next.js adds noindex. */
export default function NotFound() {
	const t = useTranslations('errors');

	return (
		<ContentPage>
			<title>{`${t('page_404_doc_title')} · Najdimo`}</title>
			<ErrorPage status={404} />
		</ContentPage>
	);
}
