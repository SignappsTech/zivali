import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/ssr/ArrowSquareOut';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Fragment } from 'react';

import { formatDate } from '@zivali/i18n/format';
import { noteClass } from '@/components/shelters/classes';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { formatDays, formatTime, getShelter, isStale, openingHoursSpecification } from '@/lib/directory';
import { absoluteUrl, jsonLd } from '@/lib/seo';

const TITLE_MAX = 60;
const labelClass = 'text-control font-bold text-muted-foreground';
const linkClass =
	'inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline decoration-1 underline-offset-4 [overflow-wrap:anywhere] hover:decoration-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** Only http(s) links from the directory are rendered. */
const safeWebsite = (website?: string) => (website && /^https?:\/\//i.test(website) ? website : undefined);
/** SL "15. 10. 2026", EN "15 October 2026" (content slice). */
const verifiedDate = (date: string, locale: Locale) => formatDate(date, locale, locale === 'sl' ? 'short' : 'long');

export async function generateMetadata({ params }: PageProps<'/[locale]/shelters/[slug]'>): Promise<Metadata> {
	const { locale: raw, slug } = await params;
	const locale = raw as Locale;
	const [t, shelter] = await Promise.all([
		getTranslations({ locale, namespace: 'shelters' }),
		getShelter(locale, slug),
	]);
	if (!shelter) return {};
	// Length rule: drop " · Najdimo", then the " – zavetišče za živali" suffix, while the title is over 60.
	const titles = [
		t('seo_page_title', { shelter: shelter.name }),
		t('seo_page_title_short', { shelter: shelter.name }),
	];
	return {
		title: titles.find((title) => title.length <= TITLE_MAX) ?? shelter.name,
		description: t('seo_page_description', {
			shelter: shelter.name,
			place: shelter.city,
			count: shelter.municipalities.length,
		}),
		alternates: {
			canonical: absoluteUrl(locale, { pathname: '/shelters/[slug]', params: { slug: shelter.slug } }),
		},
	};
}

/** T6 shelter page (P3): everything needed to reach one shelter; data from the directory API (C18). */
export default async function ShelterPage({ params }: PageProps<'/[locale]/shelters/[slug]'>) {
	const { locale: raw, slug } = await params;
	const locale = raw as Locale;
	const [t, tc, tf, shelter] = await Promise.all([
		getTranslations({ locale, namespace: 'shelters' }),
		getTranslations({ locale, namespace: 'common' }),
		getTranslations({ locale, namespace: 'footer' }),
		getShelter(locale, slug),
	]);
	if (!shelter) notFound();

	const url = absoluteUrl(locale, { pathname: '/shelters/[slug]', params: { slug: shelter.slug } });
	const website = safeWebsite(shelter.website);
	const count = shelter.municipalities.length;
	const municipalities = [...shelter.municipalities].sort((a, b) => a.name.localeCompare(b.name, locale));
	const mapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(
		`${shelter.address}, ${shelter.postal_code} ${shelter.city}`
	)}`;
	const newTab = <span className="sr-only"> {tc('opens_new_tab')}</span>;
	const h2Class = 'font-display text-2xl font-bold tracking-[-0.015em] text-balance lg:text-3xl';

	return (
		<main className="mx-auto box-content max-w-[1120px] px-5 pt-2 pb-12 lg:px-12 lg:pt-4 lg:pb-24">
			<Button asChild variant="text" className="-ml-3">
				<Link href="/shelters">
					<ArrowLeftIcon weight="bold" aria-hidden="true" />
					{t('back')}
				</Link>
			</Button>
			<h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] text-balance lg:mt-4 lg:text-5xl">
				{shelter.name}
			</h1>
			<p className="mt-2 text-sm text-muted-foreground lg:mt-3">{t('page_meta', { count })}</p>

			{isStale(shelter.verified_at) && (
				<div className={`${noteClass} mt-6 max-w-[640px] lg:mt-8`}>
					<ClockIcon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					<p>{t('stale', { date: verifiedDate(shelter.verified_at, locale) })}</p>
				</div>
			)}

			<div className="mt-8 grid max-w-[640px] gap-8 lg:mt-12 lg:gap-10">
				<div>
					<h2 className={labelClass}>{t('phone_title')}</h2>
					{shelter.phone ? (
						<>
							<p className="mt-2 text-2xl leading-[30px] font-bold whitespace-nowrap tabular-nums lg:text-3xl lg:leading-9">
								{shelter.phone_display}
							</p>
							<Button asChild size="lg" className="mt-5 max-lg:w-full">
								<a href={`tel:${shelter.phone}`} aria-label={t('call_a11y', { shelter: shelter.name })}>
									<PhoneIcon weight="bold" aria-hidden="true" />
									{t('call')}
								</a>
							</Button>
						</>
					) : (
						<>
							<p className="mt-2 max-w-[48ch]">{t('no_phone')}</p>
							{website && (
								<Button asChild size="lg" variant="secondary" className="mt-5 max-lg:w-full">
									<a href={website} target="_blank" rel="noopener">
										{t('website_button')}
										<ArrowSquareOutIcon weight="bold" aria-hidden="true" />
										{newTab}
									</a>
								</Button>
							)}
						</>
					)}
				</div>

				<div>
					<h2 className={labelClass}>{t('address_title')}</h2>
					<address className="mt-2 not-italic">
						{shelter.address}
						<br />
						{shelter.postal_code} {shelter.city}
					</address>
					<Button asChild variant="text" className="mt-1 -ml-3">
						<a href={mapUrl} target="_blank" rel="noopener">
							{t('open_map')}
							<ArrowSquareOutIcon weight="bold" aria-hidden="true" />
							{newTab}
						</a>
					</Button>
				</div>

				<div>
					<h2 className={labelClass}>{t('hours_title')}</h2>
					{shelter.opening_hours.length ? (
						<dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-8 gap-y-1.5 tabular-nums">
							{shelter.opening_hours.map((row, index) => {
								const note = locale === 'sl' ? row.note_sl : row.note_en;
								return (
									<Fragment key={index}>
										<dt>{formatDays(row.days, (day) => t(`days.${day}`))}</dt>
										<dd>
											<span className="whitespace-nowrap">
												{row.from && row.to
													? `${formatTime(row.from, locale)}–${formatTime(row.to, locale)}`
													: t('hours_closed')}
											</span>
											{note && (
												<span className="block text-sm text-muted-foreground">{note}</span>
											)}
										</dd>
									</Fragment>
								);
							})}
						</dl>
					) : (
						<p className="mt-2">{t('hours_none')}</p>
					)}
				</div>

				{shelter.phone && website && (
					<dl>
						<dt className={labelClass}>{t('website_label')}</dt>
						<dd className="mt-1">
							<a href={website} target="_blank" rel="noopener" className={linkClass}>
								{website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
								<ArrowSquareOutIcon weight="bold" aria-hidden="true" className="size-[18px] shrink-0" />
								{newTab}
							</a>
						</dd>
					</dl>
				)}
			</div>

			<section className="mt-12 lg:mt-24">
				<h2 className={h2Class}>{t('served_title', { count })}</h2>
				<ul className="mt-5 lg:mt-8 lg:columns-3 lg:gap-x-8">
					{municipalities.map((municipality) => (
						<li key={municipality.slug} className="py-1">
							{municipality.name}
						</li>
					))}
				</ul>
			</section>

			<section className="mt-12 max-w-[640px] lg:mt-24">
				<h2 className={h2Class}>{t('what_title')}</h2>
				<ul className="mt-6 grid gap-6 lg:mt-8">
					{(
						[
							[MegaphoneIcon, t('what_lost'), t('what_lost_button'), '/report/lost'],
							[HandHeartIcon, t('what_found'), t('what_found_button'), '/report/found'],
						] as const
					).map(([Icon, text, label, href]) => (
						<li key={href} className="flex gap-4">
							<Icon weight="fill" aria-hidden="true" className="size-8 shrink-0 text-primary" />
							<div>
								<p>{text}</p>
								<Button asChild variant="text" className="mt-1 -ml-3">
									<Link href={href}>
										{label}
										<ArrowRightIcon weight="bold" aria-hidden="true" />
									</Link>
								</Button>
							</div>
						</li>
					))}
				</ul>
			</section>

			<p className="mt-12 text-sm text-muted-foreground lg:mt-16">
				{t('verified_line', {
					date: verifiedDate(shelter.verified_at, locale),
					source: shelter.source || t('source_fallback'),
				})}
			</p>

			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: jsonLd({
						'@graph': [
							{
								'@type': 'AnimalShelter',
								name: shelter.name,
								url,
								...(shelter.phone && { telephone: shelter.phone }),
								address: {
									'@type': 'PostalAddress',
									streetAddress: shelter.address,
									postalCode: shelter.postal_code,
									addressLocality: shelter.city,
									addressCountry: 'SI',
								},
								openingHoursSpecification: openingHoursSpecification(shelter.opening_hours),
								areaServed: municipalities.map((municipality) => municipality.name),
								...(website && { sameAs: website }),
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
									{ '@type': 'ListItem', position: 3, name: shelter.name, item: url },
								],
							},
						],
					}),
				}}
			/>
		</main>
	);
}
