import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr/MapPinArea';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import type { Metadata } from 'next';
import { type Locale, useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { h2Class } from '@/components/content/article';
import { LiveNumbers, RecentReports, RecentReportsSkeleton } from '@/components/home/blocks';
import { ContentPage, ringClass } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { env } from '@/lib/env';
import { absoluteUrl, jsonLd, pageMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/[locale]'>): Promise<Metadata> {
	const locale = (await params).locale as Locale;
	const t = await getTranslations({ locale, namespace: 'pages.home' });
	return pageMetadata(locale, '/', 'home', {
		title: t('seo_title'),
		description: t('seo_description'),
		heading: t('hero_title'),
	});
}

// 200 % text (TASK-27.6; WCAG 1.4.4, 1.4.10): below lg the headings are clamp(1.125rem, 11.25vw, their 100 % size).
// 11.25vw is 36 px at 320, so at 100 % every width from 320 keeps the design size, and at 200 % the longest word still
// fits the narrowest box instead of being cut off; both ends are rem, so the user's text size moves them. The side
// paddings, gaps and carets stop growing at their 100 % size (as the buttons', TASK-18.8); `main` breaks a word only
// when it is wider than its box.
const h2Fluid = cn(h2Class, 'text-[clamp(1.125rem,11.25vw,1.5rem)]/[1.25]');
const h3Class =
	'font-display text-[clamp(1.125rem,11.25vw,1.25rem)]/[1.4] font-semibold tracking-[-0.01em] lg:text-2xl lg:leading-8';
const SAFE = [
	['safe_1', LockSimpleIcon],
	['safe_2', MapPinAreaIcon],
	['safe_3', ChatCircleIcon],
] as const;
// The header "Prijavi" menu's rows, words and icons (nav.report_*); sighted stays a quiet link (owner, 2026-10-19).
const CHOICES = [
	{ key: 'report_lost', href: '/report/lost', Icon: MegaphoneIcon },
	{ key: 'report_found', href: '/report/found', Icon: HandHeartIcon },
] as const;

// Placeholder photos from the design directions (P3 §Assets, docs/design/directions/img) until licensed final photos.
// WebP (quality 75): a third of the JPEG's bytes (TASK-90.5).
const PHOTOS = {
	dog: { src: '/images/placeholder-dog-aussie-wide.webp', width: 1200, height: 900 },
	cat: { src: '/images/placeholder-cat-tabby.webp', width: 800, height: 800 },
};

/** A plain <img>: no next/image client code on this page, and the Docker image ships without sharp for the optimiser. */
function Photo({
	photo,
	alt,
	eager,
	className,
}: {
	photo: (typeof PHOTOS)[keyof typeof PHOTOS];
	alt: string;
	/** The LCP element: loaded first. */
	eager?: boolean;
	className: string;
}) {
	return (
		// eslint-disable-next-line @next/next/no-img-element -- see above
		<img
			{...photo}
			alt={alt}
			loading={eager ? 'eager' : 'lazy'}
			fetchPriority={eager ? 'high' : undefined}
			decoding="async"
			className={cn('w-full bg-muted object-cover', className)}
		/>
	);
}

/**
 * T1 Home, layout B (TASK-115.1, owner's choice 2026-10-19; TASK-115.10): a photo hero whose card is the report
 * chooser (lost, found, and the quiet "sighted" link), the latest reports next to a static map teaser, the live numbers
 * band (only when the API publishes all three), how it works with a photo, safe by design as three cards, and the
 * shelters block; 48 / 96 px apart. No ad slot, no closing band. "Keep it free" waits for M4.
 */
export default function HomePage() {
	const t = useTranslations('pages.home');
	const tNav = useTranslations('nav');
	const locale = useLocale() as Locale;
	const url = absoluteUrl(locale, '/');

	return (
		// From lg the footer's own 96 px top margin is the whole gap after the last section (was 96 + 96, TASK-115.11).
		<ContentPage className="pt-2 break-words lg:pt-0 lg:pb-0">
			<section
				aria-labelledby="hero-title"
				className="relative isolate rounded-[32px] text-sidebar-foreground lg:rounded-[40px]"
			>
				{/* Only this layer clips, the zoomed photo to the card's corners; the words never are (TASK-27.6). */}
				<div className="absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
					{/* Behind the scrim the photo is decoration; the words carry the message (wireframe B). Zoomed 125 %
					    from the bottom (below lg) or the right edge (lg), the dog's face moves up out of the card's way at
					    390 and left of the card from lg, into the room the short h1 lines leave (TASK-115.11). */}
					<Photo
						photo={PHOTOS.dog}
						alt=""
						eager
						className="absolute inset-0 h-full origin-bottom scale-125 object-[58%_50%] lg:origin-right"
					/>
					{/* At least 0.66 wherever text sits (white on the scrim over white fur keeps 4.5:1 from 0.62), then
					    lighter towards and behind the card, so the photo shows around it. */}
					<div
						aria-hidden="true"
						className="absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--scrim)/0.78),hsl(var(--scrim)/0.68)_52%,hsl(var(--scrim)/0.3))] lg:bg-[linear-gradient(90deg,hsl(var(--scrim)/0.85),hsl(var(--scrim)/0.66)_55%,hsl(var(--scrim)/0.2))]"
					/>
				</div>
				{/* One minmax(0, 1fr) column below lg: the longest word no longer widens it past the viewport. */}
				<div className="grid grid-cols-1 gap-6 px-[min(1.25rem,20px)] py-7 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-12 lg:px-14 lg:py-[72px]">
					<div>
						<h1
							id="hero-title"
							className="font-display text-[clamp(1.125rem,11.25vw,2.25rem)] leading-[1.08] font-bold tracking-[-0.025em] text-balance lg:text-6xl"
						>
							{t('hero_title')}
						</h1>
						<p className="mt-3.5 text-lg leading-7 lg:mt-5 lg:max-w-[46ch] lg:text-xl lg:leading-8">
							{t('hero_lede')}
						</p>
					</div>
					<div className="rounded-card bg-card px-[min(1.25rem,20px)] py-5 text-card-foreground lg:px-7 lg:py-6">
						<h2 className={h3Class}>{tNav('report_menu_title')}</h2>
						<ul className="mt-2">
							{CHOICES.map(({ key, href, Icon }) => (
								<li key={key} className="border-t border-border first:border-t-0">
									<Link
										href={href}
										className={cn(
											'group flex min-h-16 flex-wrap items-center gap-x-3.5 gap-y-2 rounded-row py-2',
											ringClass
										)}
									>
										<span
											aria-hidden="true"
											className="grid size-12 shrink-0 place-items-center rounded-full bg-secondary text-primary"
										>
											<Icon weight="bold" className="size-[26px]" />
										</span>
										{/* The words and the caret wrap together under the icon when they do not fit beside it. */}
										<span className="flex max-w-full flex-1 items-center gap-[min(0.875rem,14px)]">
											<span className="min-w-0 flex-1">
												<span className="block text-lg font-bold group-hover:underline">
													{tNav(`${key}_title`)}
												</span>
												<span className="block text-muted-foreground">
													{tNav(`${key}_desc`)}
												</span>
											</span>
											<CaretRightIcon
												weight="bold"
												aria-hidden="true"
												className="size-[min(1.25rem,20px)] shrink-0 text-muted-foreground"
											/>
										</span>
									</Link>
								</li>
							))}
						</ul>
						{/* The header menu's "Opažena žival" row: the same words and the same flow (found, sighted choice). */}
						<p className="flex flex-wrap items-center border-t border-border pt-2">
							{t('hero_sighted_prompt')}
							{/* min-w-0: in the narrowest card (320 px, 200 % text) the label wraps inside it. */}
							<Button asChild variant="text" className="min-w-0 px-[min(0.75rem,12px)]">
								<Link href="/report/found">
									{tNav('report_sighted_title')}
									<ArrowRightIcon weight="bold" aria-hidden="true" />
								</Link>
							</Button>
						</p>
					</div>
				</div>
			</section>

			<section aria-labelledby="recent-title" className="mt-12 lg:mt-24">
				<div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
					<h2 id="recent-title" className={h2Fluid}>
						{t('near_title_no_location')}
					</h2>
					{/* From lg; below it the map teaser right under the heading is the way to the map (wireframe B). */}
					<Button asChild variant="text" className="-mr-3 hidden lg:inline-flex">
						<Link href="/map">
							{t('near_open_map')}
							<ArrowRightIcon weight="bold" aria-hidden="true" />
						</Link>
					</Button>
				</div>
				{/* Streamed: the hero paints first, the rows follow when the API (and the place names) answer. */}
				<Suspense fallback={<RecentReportsSkeleton />}>
					<RecentReports locale={locale} />
				</Suspense>
			</section>

			<Suspense>
				<LiveNumbers locale={locale} />
			</Suspense>

			<section
				aria-labelledby="how-title"
				className="mt-12 grid grid-cols-1 gap-6 lg:mt-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-12"
			>
				<div>
					<h2 id="how-title" className={h2Fluid}>
						{t('how_title')}
					</h2>
					<ol className="mt-5 grid gap-7 lg:mt-10 lg:gap-10">
						{([1, 2, 3] as const).map((step) => (
							<li key={step} className="flex gap-[min(1rem,16px)]">
								<span
									aria-hidden="true"
									className="w-[min(2.25rem,36px)] shrink-0 font-display text-[44px] leading-none font-bold tracking-[-0.02em] text-primary tabular-nums lg:w-12 lg:text-[52px]"
								>
									{step}
								</span>
								<div className="min-w-0">
									<h3 className={h3Class}>{t(`how_${step}_title`)}</h3>
									<p className="mt-1 max-w-[48ch]">{t(`how_${step}_body`)}</p>
								</div>
							</li>
						))}
					</ol>
					<Button asChild variant="text" className="mt-4 -ml-3 lg:mt-8">
						<Link href="/how-it-works">
							{t('how_more')}
							<ArrowRightIcon weight="bold" aria-hidden="true" />
						</Link>
					</Button>
				</div>
				<Photo
					photo={PHOTOS.cat}
					alt={t('hero_cat_alt')}
					className="aspect-[4/3] rounded-card lg:aspect-[4/5]"
				/>
			</section>

			<section aria-labelledby="safe-title" className="mt-12 lg:mt-24">
				<h2 id="safe-title" className={h2Fluid}>
					{t('safe_title')}
				</h2>
				<p className="mt-3 max-w-[60ch] text-lg leading-7">{t('safe_body')}</p>
				<ul className="mt-5 mb-2 grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-6">
					{SAFE.map(([key, Icon]) => (
						<li
							key={key}
							className="grid grid-cols-1 gap-2.5 rounded-card bg-card px-[min(1.25rem,20px)] py-5 text-card-foreground"
						>
							<Icon weight="bold" aria-hidden="true" className="size-7 text-primary" />
							{t(key)}
						</li>
					))}
				</ul>
				<Button asChild variant="text" className="-ml-3">
					<Link href="/safety">
						{t('safe_action')}
						<ArrowRightIcon weight="bold" aria-hidden="true" />
					</Link>
				</Button>
			</section>

			<section
				aria-labelledby="shelters-title"
				className="mt-12 rounded-card bg-card px-[min(1.5rem,24px)] py-6 text-card-foreground lg:mt-24 lg:grid lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-12 lg:py-8"
			>
				<h2 id="shelters-title" className={cn(h2Fluid, 'lg:col-span-5')}>
					{t('shelters_title')}
				</h2>
				<div className="mt-3 lg:col-span-7 lg:mt-0">
					<p className="max-w-[58ch]">{t('shelters_body')}</p>
					<Button asChild variant="text" className="mt-2 -ml-3 lg:mt-3">
						<Link href="/for-shelters">
							{t('shelters_action')}
							<ArrowRightIcon weight="bold" aria-hidden="true" />
						</Link>
					</Button>
				</div>
			</section>

			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: jsonLd({
						'@graph': [
							{
								'@type': 'Organization',
								name: 'Najdimo',
								url,
								logo: new URL('/apple-icon.png', env.NEXT_PUBLIC_APP_URL).href,
								description: t('seo_description'),
								parentOrganization: { '@type': 'Organization', name: 'Signapps' },
								areaServed: 'SI',
							},
							{ '@type': 'WebSite', name: 'Najdimo', url, inLanguage: locale },
						],
					}),
				}}
			/>
		</ContentPage>
	);
}
