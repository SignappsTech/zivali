import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr/MapPinArea';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import type { Metadata } from 'next';
import { type Locale, useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { h2Class } from '@/components/content/article';
import { LiveNumbers, RecentReports, RecentReportsSkeleton } from '@/components/home/blocks';
import { ContentPage } from '@/components/shell/page';
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

const h3Class = 'font-display text-xl leading-7 font-semibold tracking-[-0.01em] lg:text-2xl lg:leading-8';
const SAFE = [
	['safe_1', LockSimpleIcon],
	['safe_2', MapPinAreaIcon],
	['safe_3', ChatCircleIcon],
] as const;

// Placeholder photos from the design directions (P3 §Assets, docs/design/directions/img) until licensed final photos.
// WebP (quality 75): a third of the JPEG's bytes (TASK-90.5).
const PHOTOS = {
	dog: { src: '/images/placeholder-dog-aussie-wide.webp', width: 1200, height: 900 },
	cat: { src: '/images/placeholder-cat-tabby.webp', width: 800, height: 800 },
	beagle: { src: '/images/placeholder-dog-beagle.webp', width: 480, height: 480 },
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
	eager?: boolean;
	className: string;
}) {
	return (
		// eslint-disable-next-line @next/next/no-img-element -- see above
		<img
			{...photo}
			alt={alt}
			loading={eager ? 'eager' : 'lazy'}
			decoding="async"
			className={cn('w-full bg-muted object-cover', className)}
		/>
	);
}

/** The closing band sits on the dark `sidebar` fill (layout A), so its buttons take the sidebar colours and ring. */
const bandButton = 'focus-visible:outline-sidebar-ring';

/**
 * T1 Home, layout A (TASK-115.1, approved 2026-10-18): compact hero with the two report buttons and a quiet "sighted"
 * link, the latest reports straight under it, the live numbers (only when the API publishes all three), how it works,
 * safe by design, the shelters block and the closing band; 48 / 96 px apart. No ad slot. "Keep it free" waits for M4.
 */
export default function HomePage() {
	const t = useTranslations('pages.home');
	const tNav = useTranslations('nav');
	const locale = useLocale() as Locale;
	const url = absoluteUrl(locale, '/');

	return (
		<ContentPage className="pt-6 lg:pt-8">
			<section aria-labelledby="hero-title" className="grid gap-8 lg:grid-cols-12 lg:items-center lg:gap-12">
				<div className="lg:col-span-7">
					<h1
						id="hero-title"
						className="font-display text-4xl font-bold tracking-[-0.025em] text-balance lg:text-6xl"
					>
						{t('hero_title')}
					</h1>
					<p className="mt-4 max-w-[52ch] text-lg leading-7 lg:mt-6 lg:text-xl lg:leading-8">
						{t('hero_lede')}
					</p>
					<div className="mt-8 grid gap-3 lg:mt-10 lg:flex lg:flex-wrap">
						<Button asChild size="lg">
							<Link href="/report/lost">{t('hero_primary')}</Link>
						</Button>
						<Button asChild variant="secondary" size="lg">
							<Link href="/report/found">{t('hero_secondary')}</Link>
						</Button>
					</div>
					{/* The header menu's "Opažena žival" row: the same words and the same flow (found, sighted choice). */}
					<p className="mt-2 flex flex-wrap items-center">
						{t('hero_sighted_prompt')}
						<Button asChild variant="text">
							<Link href="/report/found">
								{tNav('report_sighted_title')}
								<ArrowRightIcon weight="bold" aria-hidden="true" />
							</Link>
						</Button>
					</p>
				</div>
				{/* Dropped on mobile so the buttons sit above the fold; hidden there, the lazy mosaic tiles skip download (the eager dog photo still loads). */}
				<div className="hidden lg:col-span-5 lg:grid lg:grid-cols-2 lg:gap-4">
					<Photo
						photo={PHOTOS.dog}
						alt={t('hero_alt')}
						eager
						className="row-span-2 h-full rounded-[32px] object-[58%_50%]"
					/>
					<Photo photo={PHOTOS.cat} alt={t('hero_cat_alt')} className="aspect-square rounded-[32px]" />
					<Photo photo={PHOTOS.beagle} alt="" className="aspect-square rounded-[32px]" />
				</div>
			</section>

			<section aria-labelledby="recent-title" className="mt-12 lg:mt-24">
				<div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
					<h2 id="recent-title" className={h2Class}>
						{t('near_title_no_location')}
					</h2>
					<Button asChild variant="text" className="-mr-3">
						<Link href="/map">
							{t('near_open_map')}
							<ArrowRightIcon weight="bold" aria-hidden="true" />
						</Link>
					</Button>
				</div>
				{/* Streamed: the hero paints first, the cards follow when the API (and the place names) answer. */}
				<Suspense fallback={<RecentReportsSkeleton />}>
					<RecentReports locale={locale} />
				</Suspense>
			</section>

			<Suspense>
				<LiveNumbers locale={locale} />
			</Suspense>

			<section aria-labelledby="how-title" className="mt-12 lg:mt-24">
				<h2 id="how-title" className={h2Class}>
					{t('how_title')}
				</h2>
				<ol className="mt-5 grid gap-7 lg:mt-10 lg:grid-cols-3 lg:gap-10">
					{([1, 2, 3] as const).map((step) => (
						<li key={step}>
							<span
								aria-hidden="true"
								className="block font-display text-[44px] leading-none font-bold tracking-[-0.02em] text-primary tabular-nums"
							>
								{step}
							</span>
							<h3 className={cn(h3Class, 'mt-2')}>{t(`how_${step}_title`)}</h3>
							<p className="mt-1 max-w-[48ch]">{t(`how_${step}_body`)}</p>
						</li>
					))}
				</ol>
				<Button asChild variant="text" className="mt-4 -ml-3 lg:mt-8">
					<Link href="/how-it-works">
						{t('how_more')}
						<ArrowRightIcon weight="bold" aria-hidden="true" />
					</Link>
				</Button>
			</section>

			<section
				aria-labelledby="safe-title"
				className="mt-12 grid gap-5 rounded-card bg-card p-6 text-card-foreground lg:mt-24 lg:grid-cols-[88px_minmax(0,1fr)] lg:gap-8 lg:px-12 lg:py-10"
			>
				<span
					aria-hidden="true"
					className="grid size-[88px] place-items-center rounded-full bg-secondary text-primary"
				>
					<ShieldCheckIcon weight="fill" className="size-10" />
				</span>
				<div>
					<h2 id="safe-title" className={h2Class}>
						{t('safe_title')}
					</h2>
					<p className="mt-3 max-w-[60ch] text-lg leading-7">{t('safe_body')}</p>
					<ul className="mt-5 grid gap-3.5 lg:grid-cols-3 lg:gap-6">
						{SAFE.map(([key, Icon]) => (
							<li key={key} className="flex gap-3">
								<Icon
									weight="bold"
									aria-hidden="true"
									className="mt-px size-[22px] shrink-0 text-primary"
								/>
								{t(key)}
							</li>
						))}
					</ul>
					<Button asChild variant="text" className="mt-2 -ml-3 lg:mt-4">
						<Link href="/safety">
							{t('safe_action')}
							<ArrowRightIcon weight="bold" aria-hidden="true" />
						</Link>
					</Button>
				</div>
			</section>

			<section
				aria-labelledby="shelters-title"
				className="mt-12 rounded-card bg-card p-6 text-card-foreground lg:mt-24 lg:grid lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-12 lg:py-8"
			>
				<h2 id="shelters-title" className={cn(h2Class, 'lg:col-span-5')}>
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

			<section
				aria-labelledby="cta-title"
				className="mt-12 grid gap-6 rounded-card bg-sidebar px-6 py-8 text-sidebar-foreground lg:mt-24 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-14"
			>
				<h2 id="cta-title" className={h2Class}>
					{t('cta_title')}
				</h2>
				<div className="grid gap-3 lg:flex">
					<Button
						asChild
						variant="secondary"
						size="lg"
						className={cn(
							bandButton,
							'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 active:bg-sidebar-primary/80'
						)}
					>
						<Link href="/report/lost">{t('cta_primary')}</Link>
					</Button>
					<Button
						asChild
						variant="ghost"
						size="lg"
						className={cn(
							bandButton,
							'text-sidebar-foreground shadow-[inset_0_0_0_2px_hsl(var(--sidebar-foreground))] hover:bg-sidebar-accent'
						)}
					>
						<Link href="/report/found">{t('cta_secondary')}</Link>
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
