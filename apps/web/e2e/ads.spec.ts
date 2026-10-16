import { expect, type Page, test } from '@playwright/test';

import { ad } from '@zivali/api/__fixtures__/ads';
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };
import type { AdSlot } from '@zivali/types';

import { api, signInAs } from './session';

// TASK-36.5: the P21 ad units on the web. The browser asks the API for each slot (e2e/mock-api.ts serves no ad), so
// the tests serve one here, on the browser context (the click opens a new tab), and record what the units send.
const OWNER = { id: '0b5f6a3e-6c1d-4f8e-9a2b-3c4d5e6f7a80', role: 'USER', aal: 'aal1' } as const;
const clickUrl = (slot: AdSlot) => `${api()}/v1/ads/${ad.id}/click?s=${slot}&r=8`;
const unitName = `${sl.ads.label}: ${ad.title}. ${ad.body} ${sl.ads.opens_new_tab}`;

async function serveAds(page: Page) {
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
async function watchShifts(page: Page) {
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

test('report detail at 1440: one labelled detail unit and the sidebar, both through our click counter', async ({
	page,
}) => {
	const seen = await serveAds(page);
	const cls = await watchShifts(page);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/r/Rex12345');

	const detail = page.locator('a[data-ad-slot="detail"]');
	const sidebar = page.getByRole('complementary', { name: sl.ads.sidebar_label }).getByRole('link');
	for (const [unit, slot] of [
		[detail, 'detail'],
		[sidebar, 'sidebar'],
	] as const) {
		await expect(unit).toHaveAccessibleName(unitName);
		await expect(unit).toHaveAttribute('rel', 'sponsored noopener');
		await expect(unit).toHaveAttribute('target', '_blank');
		await expect(unit).toHaveAttribute('href', clickUrl(slot));
		await expect(unit.getByText(sl.ads.label, { exact: true })).toBeVisible();
		await expect(unit.getByRole('img', { name: ad.image_alt })).toBeAttached();
	}
	expect(seen.slots.sort()).toEqual(['detail', 'sidebar']);

	// The impression: once the unit has been half in view for a second, and only once.
	await detail.scrollIntoViewIfNeeded();
	await expect.poll(() => seen.impressions).toContainEqual({ slot: 'detail', region_id: 8 });
	await page.waitForTimeout(1500);
	expect(seen.impressions.filter((body) => (body as { slot: string }).slot === 'detail')).toHaveLength(1);

	// The click goes through the counting redirect, in a new tab.
	const popup = page.waitForEvent('popup');
	await detail.click();
	await (await popup).waitForLoadState();
	expect(seen.clicks).toEqual([clickUrl('detail')]);
	expect(await cls()).toBeLessThan(0.1);
});

test('report detail at 390: the detail unit only; the sidebar asks for nothing below lg', async ({ page }) => {
	const seen = await serveAds(page);
	const cls = await watchShifts(page);
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/r/Rex12345');

	const detail = page.locator('a[data-ad-slot="detail"]');
	await detail.scrollIntoViewIfNeeded();
	await expect(detail).toHaveAccessibleName(unitName);
	await expect(page.getByRole('complementary', { name: sl.ads.sidebar_label })).toBeHidden();
	expect(seen.slots).toEqual(['detail']);
	expect(await cls()).toBeLessThan(0.1);
});

test('the reunited page has its one labelled unit', async ({ page, baseURL }) => {
	await fetch(`${api()}/e2e/reset`, { method: 'POST' });
	await fetch(`${api()}/v1/reports/Own12345/transitions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ action: 'mark_reunited' }),
	});
	await signInAs(page, OWNER, baseURL!);
	const seen = await serveAds(page);
	await page.goto('/r/Own12345/spet-doma');

	const unit = page.locator('a[data-ad-slot="reunited"]');
	await expect(unit).toHaveAccessibleName(unitName);
	await expect(unit).toHaveAttribute('href', clickUrl('reunited'));
	expect(seen.slots).toEqual(['reunited']);
});

// The report flows, manage, chat, sign-in and payments (C15 protected flows), plus cookie settings and the Partners
// page: even with an ad on offer for every slot, none renders one or asks for one.
const PROTECTED = [
	'/prijava/izgubljena-zival',
	'/en/report/lost',
	'/prijava/najdena-zival',
	'/m',
	'/vpis',
	'/en/sign-in',
	'/registracija',
	'/pozabljeno-geslo',
	'/piskotki',
	'/oglasevanje',
];
const SIGNED_IN = [
	'/nabiralnik',
	'/nabiralnik/00000000-0000-4000-8000-000000000001',
	'/placila/zakljucek',
	'/racun/placila',
];

for (const path of [...PROTECTED, ...SIGNED_IN])
	test(`${path} has no ad slot and asks for no ad`, async ({ page, baseURL }) => {
		if (SIGNED_IN.includes(path)) await signInAs(page, OWNER, baseURL!);
		const seen = await serveAds(page);
		await page.goto(path, { waitUntil: 'networkidle' });
		await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
		expect(seen.slots).toEqual([]);
	});
