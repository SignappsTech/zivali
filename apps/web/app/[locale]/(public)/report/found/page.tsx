import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { PageMessages } from '@/components/page-messages';
import { FoundFlow } from '@/components/report-found/found-flow';
import { StoreProvider } from '@/components/store-provider';
import { absoluteUrl, breadcrumbLd, jsonLd } from '@/lib/seo';
import { getViewer } from '@/lib/viewer';

import { parseLinked } from './linked';

const HREF = '/report/found';
// What the flow's client components translate (PageMessages adds the shell's namespaces).
const NAMESPACES = [
	'report_found',
	'shelter_row',
	'photos',
	'location',
	'map',
	'permissions',
	'attributes',
	'breeds',
	'ai_prefill',
	'browse',
] as const;
// The breed field on "Uredi podatke" (TASK-41.2), not the whole pet copy.
const PET_KEYS = ['breed_label', 'breed_search', 'breed_none', 'species_first'] as const;

export async function generateMetadata({ params }: PageProps<'/[locale]/report/found'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const t = await getTranslations({ locale, namespace: 'report_found' });
	// The strings carry the brand suffix themselves (P7 content slice §12).
	return {
		title: { absolute: t('seo_title') },
		description: t('seo_description'),
		alternates: { canonical: absoluteUrl(locale, HREF) },
	};
}

/**
 * P7 report found or sighted (`/prijava/najdena-zival`, `/en/report/found`, C15): public and indexable, no account.
 * `?type=sighted` enters it as a sighting; with a valid `linked_report_id` (P9 "Sporoči opažanje") it is the short
 * sighting flow linked to that lost report. A signed-in finder is asked no email. Protected flow: no ad slot (C15).
 */
export default async function ReportFoundPage({ params, searchParams }: PageProps<'/[locale]/report/found'>) {
	const locale = (await params).locale as Locale;
	const query = await searchParams;
	const linked = parseLinked(query);
	const [t, messages, viewer] = await Promise.all([
		getTranslations({ locale, namespace: 'report_found' }),
		getMessages({ locale }),
		getViewer(),
	]);

	return (
		<PageMessages
			messages={{
				...Object.fromEntries(NAMESPACES.map((ns) => [ns, messages[ns]])),
				pets: Object.fromEntries(PET_KEYS.map((key) => [key, messages.pets[key]])),
			}}
		>
			<StoreProvider>
				<FoundFlow
					// A new link (another listing, another entry) is a new flow with its own draft.
					key={linked?.id ?? String(query.type)}
					entry={query.type === 'sighted' ? 'sighted' : 'found'}
					linked={linked}
					account={Boolean(viewer)}
				/>
			</StoreProvider>
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
							breadcrumbLd(locale, t('flow_label_found'), HREF),
						],
					}),
				}}
			/>
		</PageMessages>
	);
}
