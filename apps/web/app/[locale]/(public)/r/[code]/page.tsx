import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { formatDayMonth } from '@zivali/i18n/format';
import { PageMessages } from '@/components/page-messages';
import { isActive, ReportDetail } from '@/components/report/report-detail';
import { listOf, metaDescription, metaTitle, NO_AREA, NONE } from '@/components/report/seo';
import type { DetailReport } from '@/components/report/slots';
import { GonePage } from '@/components/shell/page';
import { getPlace, getReport, type ReportPlace } from '@/lib/report';
import { absoluteUrl, jsonLd } from '@/lib/seo';

type Props = PageProps<'/[locale]/r/[code]'>;

/** Indexable only while open and visible; reunited and closed (within 30 days) stay readable with noindex (C15). */
const indexable = (report: DetailReport) => isActive(report) && (report.moderation_state ?? 'visible') === 'visible';

/** Title, description and the Open Graph alt text per the content slice §10 and §11. */
async function reportSeo(locale: Locale, report: DetailReport, place?: ReportPlace) {
	const [t, tb] = await Promise.all([
		getTranslations({ locale, namespace: 'report' }),
		getTranslations({ locale, namespace: 'browse' }),
	]);
	const kind = tb(`row_title_${report.type}`, { species: report.species });
	const municipality = place?.municipality;
	const colours = report.colours.length
		? t('seo_colours', {
				colours: listOf(
					report.colours.map((code) => t(`seo_colour.${code}`)),
					locale
				),
			})
		: NONE;
	const description = metaDescription(
		t(`seo_description_${report.type}`, {
			species: report.species,
			name: report.name ?? NONE,
			colours,
			date: formatDayMonth(report.event_at, locale),
			area: place?.area ?? NO_AREA,
			// A settlement that is its own municipality is named once.
			municipality: municipality && municipality !== place?.area ? municipality : NONE,
		})
	);
	const ogAlt = `${[kind, report.name].filter(Boolean).join(' ')}${municipality ? `, ${municipality}` : ''}`;
	return { ...metaTitle(kind, report.name, municipality), description, ogAlt, heading: report.name ?? kind };
}

async function load(props: Props) {
	const { locale: raw, code } = await props.params;
	const locale = raw as Locale;
	const result = await getReport(locale, code);
	if (!result || 'gone' in result) return { locale, result };
	const { report } = result;
	const place = await getPlace(locale, report.area.lat, report.area.lng);
	return { locale, result, place, seo: await reportSeo(locale, report, place) };
}

const canonical = (locale: Locale, report: DetailReport) =>
	absoluteUrl(locale, { pathname: '/r/[code]', params: { code: report.short_code } });

// Unknown and gone reports: the page renders the 404 or 410 page with its own title and noindex.
export async function generateMetadata(props: Props): Promise<Metadata> {
	const { locale, result, seo } = await load(props);
	if (!result || 'gone' in result || !seo) return {};
	const { report } = result;
	const url = canonical(locale, report);
	return {
		title: { absolute: seo.title },
		description: seo.description,
		alternates: { canonical: url },
		...(!indexable(report) && { robots: { index: false } }),
		openGraph: {
			type: 'article',
			siteName: 'Najdimo',
			locale: locale === 'sl' ? 'sl_SI' : 'en_GB',
			url,
			title: seo.og,
			description: seo.description,
			// The photo and the type label, never the location (FR-011 R-011.3); one image URL per report, SL by default.
			images: [
				{
					url: `/r/${encodeURIComponent(report.short_code)}/opengraph-image${locale === 'en' ? '?lang=en' : ''}`,
					width: 1200,
					height: 630,
					alt: seo.ogAlt,
				},
			],
		},
		twitter: { card: 'summary_large_image' },
	};
}

/**
 * P9 report detail (`/r/[code]`, `/en/r/[code]`, C15), server-rendered from GET /v1/reports/:code (C4): public fields
 * and the fuzzed area; the owner (signed in, or the /m manage-link session) also gets their view. Hidden, removed and
 * long-closed reports render the 410 page; proxy.ts sets the HTTP status (410, 404) for document requests.
 */
export default async function ReportPage(props: Props) {
	const { locale, result, place, seo } = await load(props);
	if (!result) notFound();
	if ('gone' in result || !seo) return <GonePage />;
	const { report } = result;
	const url = canonical(locale, report);
	const { map, nav, report: copy } = await getMessages({ locale });
	const organisation = { '@type': 'Organization', name: 'Najdimo', url: absoluteUrl(locale, '/') };

	return (
		// Client copy: the gallery's controls and MapView's own strings.
		<PageMessages
			messages={{
				map,
				report: {
					photo_prev: copy.photo_prev,
					photo_next: copy.photo_next,
					photo_position: copy.photo_position,
					photo_thumb: copy.photo_thumb,
					photo_failed: copy.photo_failed,
				},
			}}
		>
			<ReportDetail report={report} place={place} />
			{indexable(report) && (
				<script
					type="application/ld+json"
					// Public fields only: never the chip number, the exact point or contact data (content slice §10).
					dangerouslySetInnerHTML={{
						__html: jsonLd({
							'@graph': [
								{
									'@type': 'Article',
									headline: seo.heading,
									description: seo.description,
									url,
									...(report.photos.length > 0 && { image: report.photos.map((photo) => photo.url) }),
									datePublished: report.created_at,
									dateModified: report.updated_at,
									author: organisation,
									publisher: organisation,
									...(place && { contentLocation: { '@type': 'Place', name: place.label } }),
									inLanguage: locale,
									isAccessibleForFree: true,
								},
								{
									'@type': 'BreadcrumbList',
									itemListElement: [
										{
											'@type': 'ListItem',
											position: 1,
											name: 'Najdimo',
											item: absoluteUrl(locale, '/'),
										},
										{
											'@type': 'ListItem',
											position: 2,
											name: nav.map,
											item: absoluteUrl(locale, '/map'),
										},
										{ '@type': 'ListItem', position: 3, name: seo.heading, item: url },
									],
								},
							],
						}),
					}}
				/>
			)}
		</PageMessages>
	);
}
