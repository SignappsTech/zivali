import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ContentPage, Placeholder } from '@/components/shell/page';

// Pages the shell links to whose stories have not shipped yet (C15) get a calm placeholder instead of a 404, so the
// header and footer links work (0 broken links). A real route folder wins over this catch-all, so each story's page
// replaces its entry. Every other unknown path renders the 404 inside the locale layout, with the CSP nonce.
const PENDING = {
	'/map': 'nav.map',
	'/report/lost': 'nav.report_lost_title',
	'/report/found': 'nav.report_found_title',
	'/sign-in': 'nav.sign_in',
	'/how-it-works': 'footer.how_it_works',
	'/safety': 'footer.safety',
	'/faq': 'footer.faq',
	'/for-shelters': 'footer.for_shelters',
	'/advertise': 'footer.partners',
	'/about': 'footer.about',
	'/privacy': 'footer.privacy',
	'/cookies': 'footer.cookies',
	'/terms': 'footer.terms',
	'/imprint': 'footer.imprint',
	'/accessibility': 'footer.accessibility',
} as const;

async function pendingTitle({ params }: PageProps<'/[locale]/[...rest]'>) {
	const { locale, rest } = await params;
	const key = PENDING[`/${rest.join('/')}` as keyof typeof PENDING];
	return key && (await getTranslations({ locale: locale as Locale }))(key);
}

// The page answers the 404; notFound() here would leave the streamed 404 without its HTML.
export async function generateMetadata(props: PageProps<'/[locale]/[...rest]'>): Promise<Metadata> {
	const title = await pendingTitle(props);
	return title ? { title, robots: { index: false } } : {};
}

export default async function CatchAll(props: PageProps<'/[locale]/[...rest]'>) {
	const title = await pendingTitle(props);
	if (!title) notFound();

	return (
		<ContentPage>
			<Placeholder title={title} />
		</ContentPage>
	);
}
