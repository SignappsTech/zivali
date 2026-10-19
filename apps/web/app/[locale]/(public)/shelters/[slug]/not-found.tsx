import { useTranslations } from 'next-intl';

import { ContentPage, ErrorPage } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/** P1 404 for an unknown or inactive shelter slug, plus a way back to the T5 directory (P3 §T6 States). */
export default function ShelterNotFound() {
	const t = useTranslations('errors');
	const ts = useTranslations('shelters');

	return (
		<ContentPage>
			<title>{`${t('page_404_doc_title')} · Najdimo`}</title>
			<ErrorPage status={404}>
				<Button asChild variant="text" size="lg">
					<Link href="/shelters">{ts('back')}</Link>
				</Button>
			</ErrorPage>
		</ContentPage>
	);
}
