import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/ssr/LockSimple';
import { MapPinAreaIcon } from '@phosphor-icons/react/dist/ssr/MapPinArea';
import { ShieldCheckIcon } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import type { Metadata } from 'next';
import { type Locale, useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { h2Class } from '@/components/content/article';
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
// WebP (quality 75, same size): the hero is the LCP element, a third of the JPEG's bytes (TASK-90.5).
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
 * T1 Home (P3): split hero, how it works with a photo, safe by design, the shelters block; each section its own layout,
 * 48 / 96 px apart. No ad slot. "Near you" waits for the report search (TASK-31.3) and "Keep it free" for M4.
 */
export default function HomePage() {
	const t = useTranslations('pages.home');
	const locale = useLocale();
	const url = absoluteUrl(locale, '/');

	return (
		<ContentPage className="pt-6">
			<section aria-labelledby="hero-title" className="grid gap-8 lg:grid-cols-12 lg:items-center">
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
					<div className="mt-8 grid gap-1 lg:mt-10 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
						<Button asChild size="lg">
							<Link href="/report/lost">{t('hero_primary')}</Link>
						</Button>
						<Button asChild variant="text" size="lg">
							<Link href="/report/found">
								{t('hero_secondary')}
								<ArrowRightIcon weight="bold" aria-hidden="true" />
							</Link>
						</Button>
					</div>
				</div>
				<Photo
					photo={PHOTOS.dog}
					alt={t('hero_alt')}
					eager
					className="aspect-[4/3] rounded-[32px] lg:col-span-5 lg:aspect-[4/5] lg:rounded-[36px]"
				/>
			</section>

			{/* Below lg the column dissolves into the grid, so the photo sits between the steps and the link. */}
			<section aria-labelledby="how-title" className="mt-12 grid gap-8 lg:mt-24 lg:grid-cols-12 lg:items-center">
				<div className="contents lg:col-span-7 lg:block">
					<h2 id="how-title" className={h2Class}>
						{t('how_title')}
					</h2>
					<ol className="-mt-2 grid gap-7 lg:mt-10 lg:gap-10">
						{([1, 2, 3] as const).map((step) => (
							<li key={step} className="flex gap-4 lg:gap-6">
								<span
									aria-hidden="true"
									className="w-8 shrink-0 font-display text-4xl font-bold tracking-[-0.02em] text-primary tabular-nums lg:w-12 lg:text-5xl"
								>
									{step}
								</span>
								<div>
									<h3 className={h3Class}>{t(`how_${step}_title`)}</h3>
									<p className="mt-1 max-w-[48ch] lg:mt-2">{t(`how_${step}_body`)}</p>
								</div>
							</li>
						))}
					</ol>
					<Button
						asChild
						variant="text"
						className="order-last -mt-4 -ml-3 justify-self-start lg:order-none lg:mt-8"
					>
						<Link href="/how-it-works">
							{t('how_more')}
							<ArrowRightIcon weight="bold" aria-hidden="true" />
						</Link>
					</Button>
				</div>
				<Photo
					photo={PHOTOS.cat}
					alt={t('how_alt')}
					className="aspect-[4/3] rounded-card lg:col-span-5 lg:aspect-[4/5]"
				/>
			</section>

			<section aria-labelledby="safe-title" className="mt-12 lg:mt-24 lg:flex lg:items-start lg:gap-8">
				<span
					aria-hidden="true"
					className="grid size-[88px] shrink-0 place-items-center rounded-full bg-secondary text-primary"
				>
					<ShieldCheckIcon weight="fill" className="size-10" />
				</span>
				<div className="mt-6 max-w-[640px] lg:mt-0">
					<h2 id="safe-title" className={h2Class}>
						{t('safe_title')}
					</h2>
					<p className="mt-3 text-lg leading-7 lg:mt-4 lg:text-xl lg:leading-8">{t('safe_body')}</p>
					<ul className="mt-5 grid gap-3.5 lg:mt-6">
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
					<Button asChild variant="text" className="mt-4 -ml-3 lg:mt-6">
						<Link href="/safety">
							{t('safe_action')}
							<ArrowRightIcon weight="bold" aria-hidden="true" />
						</Link>
					</Button>
				</div>
			</section>

			<section
				aria-labelledby="shelters-title"
				className="mt-12 rounded-card bg-card p-5 text-card-foreground lg:mt-24 lg:grid lg:grid-cols-12 lg:items-center lg:gap-8 lg:p-6"
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
