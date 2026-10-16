import type { Page } from '@playwright/test';

import { ad } from '@zivali/api/__fixtures__/ads';
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };
import type { AdSlot } from '@zivali/types';

import { api } from './session';

// TASK-36.5: the P21 ad units on the web. The browser asks the API for each slot (e2e/mock-api.ts serves no ad), so
// the tests serve one here, on the browser context (the click opens a new tab), and record what the units send.
export const clickUrl = (slot: AdSlot) => `${api()}/v1/ads/${ad.id}/click?s=${slot}&r=8`;
// The accessible name: label, title, text, the visible button text (WCAG 2.5.3; none in the feed row), new-tab note.
export const unitName = `${sl.ads.label}: ${ad.title}. ${ad.body} ${ad.cta} ${sl.ads.opens_new_tab}`;
export const feedName = `${sl.ads.label}: ${ad.title}. ${ad.body} ${sl.ads.opens_new_tab}`;

export async function serveAds(page: Page) {
	const seen = { slots: [] as string[], impressions: [] as unknown[], clicks: [] as string[] };
	await page.context().route(
		(url) => url.pathname.startsWith('/v1/ads/'),
		(route) => {
			const request = route.request();
			const url = new URL(request.url());
			const headers = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
			};
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
			const slot = url.pathname.match(/^\/v1\/ads\/slot\/(\w+)$/)?.[1] as AdSlot | undefined;
			if (slot) {
				seen.slots.push(slot);
				// The fixture, with its image from the mock API (MEDIA_BASE_URL, so the CSP allows it).
				const served = { ...ad, image_url: `${api()}/media/ad.png`, click_url: clickUrl(slot) };
				return route.fulfill({ headers: { ...headers, 'Cache-Control': 'private, max-age=60' }, json: served });
			}
			if (url.pathname.endsWith('/impressions')) {
				seen.impressions.push(request.postDataJSON());
				return route.fulfill({ status: 204, headers });
			}
			// The counting redirect (apps/api answers 302 to the sponsor's link): the tab lands on this page.
			seen.clicks.push(request.url());
			return route.fulfill({ contentType: 'text/html', body: '<title>Sponsor</title>' });
		}
	);
	return seen;
}

/** Sums the layout shifts not caused by input (CLS), from the first paint. */
export async function watchShifts(page: Page) {
	await page.addInitScript(() => {
		const w = window as unknown as { cls: number };
		w.cls = 0;
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[])
				if (!entry.hadRecentInput) w.cls += entry.value;
		}).observe({ type: 'layout-shift', buffered: true });
	});
	return () => page.evaluate(() => (window as unknown as { cls: number }).cls);
}
