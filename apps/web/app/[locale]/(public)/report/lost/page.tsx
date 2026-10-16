import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { PageMessages } from '@/components/page-messages';
import { LostFlow } from '@/components/report-lost/lost-flow';
import { StoreProvider } from '@/components/store-provider';
import { env } from '@/lib/env';
import { absoluteUrl, breadcrumbLd, jsonLd } from '@/lib/seo';
import { getViewer } from '@/lib/viewer';

const HREF = '/report/lost';
// What the flow's client components translate (PageMessages adds the shell's namespaces): the steps, the sign-in
// dialog (auth) and the confirmation (shelter_row, share, poster, support).
const NAMESPACES = [
	'report_lost',
	'pets',
	'attributes',
	'breeds',
	'photos',
	'location',
	'map',
	'permissions',
	'auth',
	'shelter_row',
	'share',
	'poster',
	'support',
] as const;
// The confirmation's share menu rows and its poster dialog title (lost-done.tsx), not the whole report copy.
const REPORT_KEYS = ['share_copy', 'share_whatsapp', 'share_facebook', 'share_poster'] as const;

export async function generateMetadata({ params }: PageProps<'/[locale]/report/lost'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const t = await getTranslations({ locale, namespace: 'report_lost' });
	// The strings carry the brand suffix themselves (P6 content slice §12).
	return {
		title: { absolute: t('seo_title') },
		description: t('seo_description'),
		alternates: { canonical: absoluteUrl(locale, HREF) },
	};
}

/**
 * P6 report lost (`/prijava/izgubljena-zival`, `/en/report/lost`): public and indexable, the steps are client-side.
 * Everyone gets the flow: a visitor fills it first and signs in or up at Publish (C3 draft hand-off). `?pet=` (from
 * a pet profile) preselects that saved pet and stays in the `next` of the sign-in round trip. Protected flow: no ad
 * slot (C15).
 */
export default async function ReportLostPage({ params, searchParams }: PageProps<'/[locale]/report/lost'>) {
	const locale = (await params).locale as Locale;
	const pet = (await searchParams).pet;
	const [t, messages, viewer] = await Promise.all([
		getTranslations({ locale, namespace: 'report_lost' }),
		getMessages({ locale }),
		getViewer(),
	]);
	const ld = (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: jsonLd({
					'@graph': [
						{
							'@type': 'WebPage',
							url: absoluteUrl(locale, HREF),
							name: t('seo_title'),
							description: t('seo_description'),
							inLanguage: locale,
						},
						breadcrumbLd(locale, t('flow_label'), HREF),
					],
				}),
			}}
		/>
	);

	return (
		<PageMessages
			messages={{
				...Object.fromEntries(NAMESPACES.map((ns) => [ns, messages[ns]])),
				report: Object.fromEntries(REPORT_KEYS.map((key) => [key, messages.report[key]])),
				browse: { status_reunited: messages.browse.status_reunited },
			}}
		>
			<StoreProvider>
				<LostFlow
					initialPet={typeof pet === 'string' ? pet : undefined}
					signedIn={viewer !== null}
					testMode={env.APP_ENV !== 'production'}
				/>
			</StoreProvider>
			{ld}
		</PageMessages>
	);
}
