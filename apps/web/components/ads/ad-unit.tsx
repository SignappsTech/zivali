'use client';

import { useLocale } from 'next-intl';
import * as React from 'react';

import { track } from '@zivali/analytics';
import { createApiClient, type Locale } from '@zivali/api/client';
import { type Ad, type AdSlot as Slot, REGION_SLUGS, type RegionSlug } from '@zivali/types';
import { type AdSlotProps, ReservedAd } from '@/components/ads/ad-slot';
import { AdView } from '@/components/ads/ad-view';

// As lib/store.ts, which this chunk does not import: it brings the RTK store.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');

// The API targets by region id (index + 1 in REGION_SLUGS), a report has the slug.
type Region = RegionSlug;
const asRegion = (slug?: string) => REGION_SLUGS.find((region) => region === slug);

/** Only our click counter (C14 `click_url`: it counts, then 302s to the https link stored with the ad) is a link. */
export const isOurClickUrl = (url: string) => url.startsWith(`${API_URL}/v1/ads/`);

const SIDEBAR_FROM = '(min-width: 64rem)';
// matchMedia is read on the client only (useSyncExternalStore's server snapshot is true: the request is an effect).
const wideNow = () => window.matchMedia?.(SIDEBAR_FROM).matches !== false;
const subscribeWide = (notify: () => void) => {
	const query = window.matchMedia?.(SIDEBAR_FROM);
	query?.addEventListener('change', notify);
	return () => query?.removeEventListener('change', notify);
};
const VISIBLE_RATIO = 0.5;
const VISIBLE_MS = 1000;

/**
 * The served unit (C14 `GET /v1/ads/slot/:slot`). Non-personalised: C12 asks for no ads consent, so the request
 * carries only the page's context (slot, region, species, locale), no session token, device id or cookie. The
 * impression goes to our aggregate count once, when at least half the unit has been in view for a second (never on
 * the server); `ad_slot_impression` and `ad_slot_click` reach GA only with consent (`track()` is a no-op without it,
 * C12).
 */
export function AdUnit({ slot, species, region: slug, className }: AdSlotProps) {
	const locale = useLocale() as Locale;
	const region = asRegion(slug);
	const region_id = region && REGION_SLUGS.indexOf(region) + 1;
	// undefined while loading; null collapses the slot (no ad, an error, a blocked request, a foreign link).
	const [ad, setAd] = React.useState<Ad | null>();
	// The sidebar shows from lg only: below it the hidden box asks for nothing, and asks once the window grows past lg.
	const wide = React.useSyncExternalStore(subscribeWide, wideNow, () => true);
	const unit = React.useRef<HTMLAnchorElement>(null);
	const counted = React.useRef<string>(undefined);

	React.useEffect(() => {
		if (slot === 'sidebar' && !wide) return;
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
	}, [slot, wide, region_id, species, locale]);

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
					track('ad_slot_impression', gaParams(slot, ad.id, region, species));
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

	return (
		<AdView
			ad={ad}
			slot={slot}
			href={ad.click_url}
			ref={unit}
			onClick={() => track('ad_slot_click', gaParams(slot, ad.id, region, species))}
			className={className}
		/>
	);
}

/** C12 `ad_slot_impression` / `ad_slot_click`: the slot, the ad id and, beside a report, its region and species. */
const gaParams = (ad_slot: Slot, ad_id: string, region?: Region, species?: AdSlotProps['species']) => ({
	ad_slot,
	ad_id,
	...(region && { region }),
	...(species && { species }),
});
