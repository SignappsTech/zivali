import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { ApiError } from '@zivali/api/client';
import { PageMessages } from '@/components/page-messages';
import { noteClass, titleLinkClass } from '@/components/shelters/classes';
import { ShelterSearch } from '@/components/shelters/shelter-search';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { e164, getMunicipalities, getShelters } from '@/lib/directory';
import { absoluteUrl, jsonLd } from '@/lib/seo';

/** Both lists or null when the directory API cannot answer (the page shows the inline error, not a 500). */
async function load(locale: Locale) {
	try {
		const [shelters, municipalities] = await Promise.all([getShelters(locale), getMunicipalities(locale)]);
		return { shelters: shelters.items, municipalities: municipalities.items };
	} catch (error) {
		if (error instanceof ApiError) return null;
		throw error;
	}
}

export async function generateMetadata({ params }: PageProps<'/[locale]/shelters'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const [t, data] = await Promise.all([getTranslations({ locale, namespace: 'shelters' }), load(locale)]);
	return {
		// The string carries the brand suffix itself (shelters content slice), so not through the layout template.
		title: { absolute: t('seo_title') },
		description: t('seo_description', { count: data?.shelters.length ?? 0 }),
		alternates: { canonical: absoluteUrl(locale, '/shelters') },
		// An error state is not a page to index.
		...(data ? {} : { robots: { index: false } }),
	};
}

/** T5 shelter directory (P3): find the responsible shelter for a municipality, then all shelters. */
export default async function SheltersPage({ params }: PageProps<'/[locale]/shelters'>) {
	const locale = (await params).locale as Locale;
	const [t, tc, tf, messages, data] = await Promise.all([
		getTranslations({ locale, namespace: 'shelters' }),
		getTranslations({ locale, namespace: 'common' }),
		getTranslations({ locale, namespace: 'footer' }),
		getMessages({ locale }),
		load(locale),
	]);
	const served = new Map<string, number>();
	for (const { shelter_slug } of data?.municipalities ?? [])
		if (shelter_slug) served.set(shelter_slug, (served.get(shelter_slug) ?? 0) + 1);
	const url = (slug: string) => absoluteUrl(locale, { pathname: '/shelters/[slug]', params: { slug } });

	return (
		<main id="main" className="mx-auto box-content max-w-[1120px] px-5 pt-6 pb-12 lg:px-12 lg:pt-8 lg:pb-24">
			<div className="max-w-[640px]">
				<h1 className="font-display text-3xl font-bold tracking-[-0.02em] text-balance lg:text-5xl">
					{t('h1')}
				</h1>
				<p className="mt-3 text-lg leading-7 lg:mt-4 lg:text-xl lg:leading-8">{t('lede')}</p>
				{data ? (
					<PageMessages messages={{ shelters: messages.shelters }}>
						<ShelterSearch
							municipalities={data.municipalities.map(({ slug, name }) => ({ slug, name }))}
							className="mt-8 lg:mt-10"
						/>
					</PageMessages>
				) : (
					<div className={`${noteClass} mt-8 lg:mt-10`} role="alert">
						<WarningCircleIcon
							weight="fill"
							aria-hidden="true"
							className="mt-px size-[22px] shrink-0 text-destructive"
						/>
						<div>
							<p>{t('error')}</p>
							<Button asChild variant="text" className="mt-1 -ml-3">
								<Link href="/shelters">
									<ArrowClockwiseIcon weight="bold" aria-hidden="true" />
									{tc('try_again')}
								</Link>
							</Button>
						</div>
					</div>
				)}
			</div>
			{data && (
				<section id="all" className="mt-12 lg:mt-24">
					<h2 className="font-display text-2xl font-bold tracking-[-0.015em] text-balance lg:text-3xl">
						{t('all_title', { count: data.shelters.length })}
					</h2>
					<ul className="mt-6 lg:mt-8 lg:columns-2 lg:gap-x-8">
						{data.shelters.map((shelter) => {
							const servedCount = served.get(shelter.slug);
							return (
								<li
									key={shelter.slug}
									className="mb-5 break-inside-avoid lg:flex lg:items-center lg:justify-between lg:gap-4"
								>
									<div className="min-w-0">
										<h3 className="font-display text-xl leading-7 font-semibold tracking-[-0.01em] text-balance lg:text-2xl lg:leading-8">
											<Link
												href={{ pathname: '/shelters/[slug]', params: { slug: shelter.slug } }}
												className={titleLinkClass}
											>
												{shelter.name}
											</Link>
										</h3>
										<p className="text-sm text-muted-foreground">
											{servedCount
												? t('row_meta', { area: shelter.city, count: servedCount })
												: shelter.city}
										</p>
									</div>
									{shelter.phone_display ? (
										<Button asChild variant="text" className="-ml-3 tabular-nums lg:ml-0">
											<a href={`tel:${e164(shelter.phone_display)}`}>
												<PhoneIcon weight="bold" aria-hidden="true" />
												{shelter.phone_display}
											</a>
										</Button>
									) : (
										<p className="shrink-0 text-sm text-muted-foreground">{t('row_no_phone')}</p>
									)}
								</li>
							);
						})}
					</ul>
				</section>
			)}
			{data && (
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: jsonLd({
							'@graph': [
								{
									'@type': 'CollectionPage',
									name: t('h1'),
									url: absoluteUrl(locale, '/shelters'),
									mainEntity: {
										'@type': 'ItemList',
										itemListElement: data.shelters.map((shelter, index) => ({
											'@type': 'ListItem',
											position: index + 1,
											item: {
												'@type': 'AnimalShelter',
												name: shelter.name,
												url: url(shelter.slug),
												...(shelter.phone_display && {
													telephone: e164(shelter.phone_display),
												}),
											},
										})),
									},
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
											name: tf('shelters'),
											item: absoluteUrl(locale, '/shelters'),
										},
									],
								},
							],
						}),
					}}
				/>
			)}
		</main>
	);
}
