'use client';

import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { track } from '@zivali/analytics';
import { createApiClient, type Locale } from '@zivali/api/client';
import type { Ad, AdSlot as Slot } from '@zivali/types';
import { type AdSlotProps, RESERVED, ReservedAd } from '@/components/ads/ad-slot';
import { ringClass, SpotIllustration } from '@/components/shell/page';
import { cn } from '@/lib/utils';

// As lib/store.ts, which this chunk does not import: it brings the RTK store.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

// C6 `regions.id` 1 to 12 in this order (supabase/seed/geo/regions.geojson): the API targets by id, a report has the slug.
const REGIONS = [
	'pomurska',
	'podravska',
	'koroska',
	'savinjska',
	'zasavska',
	'posavska',
	'jugovzhodna-slovenija',
	'osrednjeslovenska',
	'gorenjska',
	'primorsko-notranjska',
	'goriska',
	'obalno-kraska',
] as const;
type Region = (typeof REGIONS)[number];
const asRegion = (slug?: string) => REGIONS.find((region) => region === slug);

/** Only our click counter (C14 `click_url`: it counts, then 302s to the https link stored with the ad) is a link. */
export const isOurClickUrl = (url: string) => url.startsWith(`${API_URL}/v1/ads/`);

/** "Oglas: title. body": the label once and the full text, even when the lines are clamped (P21, content §4). */
const a11yName = (label: string, body: string) => `${label}${/[.?!]$/.test(label) ? ' ' : '. '}${body}`;

const SIDEBAR_FROM = '(min-width: 64rem)';
const VISIBLE_RATIO = 0.5;
const VISIBLE_MS = 1000;

const unitClass = cn(
	'block rounded-card bg-muted text-foreground hover:bg-[linear-gradient(hsl(var(--foreground)/0.08),hsl(var(--foreground)/0.08))]',
	ringClass
);
const labelClass = 'block text-xs leading-4 font-bold text-muted-foreground';
const titleClass = 'block font-display text-lg leading-6 font-semibold tracking-[-0.01em]';
const bodyClass = 'block text-base leading-6';
// The unit is the link: this is its visible text button, not a second target.
const buttonClass = 'inline-flex min-h-11 items-center -ml-3 px-3 font-bold text-primary';
// The image boxes: the 1:1 crop of the 4:3 file (feed 64, detail and reunited 96), the sidebar's 4:3 on top.
const BOX = { feed: 'size-16', inline: 'size-24', sidebar: 'aspect-[4/3] w-full' } as const;
const PX = { feed: [64, 64], inline: [96, 96], sidebar: [288, 216] } as const;

function AdImage({ ad, box }: { ad: Ad; box: keyof typeof BOX }) {
	if (ad.image_url) {
		const [width, height] = PX[box];
		return (
			// The API serves the stored rendition (C14); next/image would proxy it again.
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={ad.image_url}
				alt={ad.image_alt}
				width={width}
				height={height}
				loading="lazy"
				decoding="async"
				className={cn('shrink-0 rounded-row bg-card object-cover', BOX[box])}
			/>
		);
	}
	// House ads have no image until TASK-36.1 to 36.3: the spot illustration, decorative, cropped like the image.
	// A sponsor without one gets the text-only unit (P21 S3).
	if (!ad.is_house) return null;
	return (
		<span aria-hidden="true" className={cn('flex shrink-0 justify-center overflow-hidden rounded-row', BOX[box])}>
			<SpotIllustration className="h-full w-auto max-w-none shrink-0 rounded-none" />
		</span>
	);
}

/**
 * The served unit (C14 `GET /v1/ads/slot/:slot`). Non-personalised: C12 asks for no ads consent, so the request
 * carries only the page's context (slot, region, species, locale), no session token, device id or cookie. The
 * impression goes to our aggregate count once, when at least half the unit has been in view for a second (never on
 * the server); `ad_impression` and `ad_click` reach GA only with consent (`track()` is a no-op without it, C12).
 */
export function AdUnit({ slot, species, region: slug, className }: AdSlotProps) {
	const t = useTranslations('ads');
	const locale = useLocale() as Locale;
	const region = asRegion(slug);
	const region_id = region && REGIONS.indexOf(region) + 1;
	// undefined while loading; null collapses the slot (no ad, an error, a blocked request, a foreign link).
	const [ad, setAd] = React.useState<Ad | null>();
	const unit = React.useRef<HTMLAnchorElement>(null);
	const counted = React.useRef<string>(undefined);

	React.useEffect(() => {
		// The sidebar shows from lg only: below it the hidden box asks for nothing.
		if (slot === 'sidebar' && window.matchMedia?.(SIDEBAR_FROM).matches === false) return;
		const request = new AbortController();
		// TODO(TASK-55): the ad-free path (Premium, M4) sends the session token here, and the API answers null.
		createApiClient({ baseUrl: API_URL, locale })
			.request<Ad | null>('GET', `/v1/ads/slot/${slot}`, {
				query: { region_id, species, locale },
				signal: request.signal,
			})
			.then(
				(served) => !request.signal.aborted && setAd(served && isOurClickUrl(served.click_url) ? served : null),
				() => !request.signal.aborted && setAd(null)
			);
		return () => request.abort();
	}, [slot, region_id, species, locale]);

	React.useEffect(() => {
		const node = unit.current;
		if (!ad || !node || counted.current === ad.id || typeof IntersectionObserver === 'undefined') return;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting || entry.intersectionRatio < VISIBLE_RATIO) {
					clearTimeout(timer);
					timer = undefined;
					return;
				}
				timer ??= setTimeout(() => {
					observer.disconnect();
					counted.current = ad.id;
					createApiClient({ baseUrl: API_URL, locale })
						.request('POST', `/v1/ads/${ad.id}/impressions`, {
							body: { slot, ...(region_id && { region_id }) },
						})
						.catch(() => undefined);
					track('ad_impression', gaParams(slot, ad.id, region, species));
				}, VISIBLE_MS);
			},
			{ threshold: VISIBLE_RATIO }
		);
		observer.observe(node);
		return () => {
			observer.disconnect();
			clearTimeout(timer);
		};
	}, [ad, slot, region, region_id, species, locale]);

	if (ad === undefined) return <ReservedAd slot={slot} className={className} />;
	if (!ad) return null;

	const label = <span className={labelClass}>{t('label')}</span>;
	const cta = <span className={buttonClass}>{ad.cta || t('learn_more')}</span>;
	return (
		<a
			ref={unit}
			href={ad.click_url}
			target="_blank"
			rel="sponsored noopener"
			aria-label={`${a11yName(t('unit_a11y', { title: ad.title }), ad.body)} ${t('opens_new_tab')}`}
			data-ad-slot={slot}
			onClick={() => track('ad_click', gaParams(slot, ad.id, region, species))}
			className={cn(
				unitClass,
				slot === 'feed' ? 'flex items-center gap-3 p-3' : 'p-4',
				RESERVED[slot],
				className
			)}
		>
			{slot === 'feed' ? (
				<>
					<AdImage ad={ad} box="feed" />
					<span className="min-w-0 flex-1">
						{label}
						<span className={cn(titleClass, 'truncate')}>{ad.title}</span>
						<span className={cn(bodyClass, 'truncate')}>{ad.body}</span>
					</span>
					<CaretRightIcon
						weight="bold"
						aria-hidden="true"
						className="size-5 shrink-0 text-muted-foreground"
					/>
				</>
			) : slot === 'sidebar' ? (
				<>
					<span className={cn(labelClass, 'mb-2')}>{t('label')}</span>
					<AdImage ad={ad} box="sidebar" />
					<span className={cn(titleClass, 'mt-3 line-clamp-2')}>{ad.title}</span>
					<span className={cn(bodyClass, 'mt-1 line-clamp-3')}>{ad.body}</span>
					{cta}
				</>
			) : (
				<>
					{label}
					<span className="mt-2 flex items-start gap-4">
						<AdImage ad={ad} box="inline" />
						<span className="block min-w-0 flex-1">
							<span className={cn(titleClass, 'line-clamp-2')}>{ad.title}</span>
							<span className={cn(bodyClass, 'line-clamp-2')}>{ad.body}</span>
							<span className="mt-1 block">{cta}</span>
						</span>
					</span>
				</>
			)}
		</a>
	);
}

/** C12 `ad_impression` / `ad_click`: the slot, the ad id and, beside a report, its region and species. */
const gaParams = (ad_slot: Slot, ad_id: string, region?: Region, species?: AdSlotProps['species']) => ({
	ad_slot,
	ad_id,
	...(region && { region }),
	...(species && { species }),
});
