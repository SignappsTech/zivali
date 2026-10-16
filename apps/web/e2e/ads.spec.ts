import { expect, test } from '@playwright/test';

import { ad } from '@zivali/api/__fixtures__/ads';
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };

import { clickUrl, feedName, serveAds, unitName, watchShifts } from './ads';
import { signInAs } from './session';

// TASK-36.5: the P21 ad units on the web (detail and sidebar here; the reunited unit is in lifecycle.spec.ts). The
// browser asks the API for each slot, so ads.ts serves one on the browser context (the click opens a new tab).
const OWNER = { id: '0b5f6a3e-6c1d-4f8e-9a2b-3c4d5e6f7a80', role: 'USER', aal: 'aal1' } as const;

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

// The feed: an ad after every eighth report in the list, one request, no shift when it loads in (CLS < 0.1).
test('the feed row after the eighth report, with its reserved row', async ({ page }) => {
	const seen = await serveAds(page);
	const cls = await watchShifts(page);
	// Empty tiles and ten reports (the browser calls the API, so page.route answers).
	await page.route('https://tiles.openfreemap.org/**', (route) =>
		route.fulfill({ json: {}, headers: { 'access-control-allow-origin': '*' } })
	);
	const items = Array.from({ length: 10 }, (_, i) => ({
		id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
		short_code: `Code${i + 1}`,
		type: 'lost',
		status: 'open',
		species: 'dog',
		area: { lat: 46.05, lng: 14.5, radius_m: 500 },
		boosted: false,
		thumb_url: null,
		breed_codes: [],
		colours: [],
		pattern: null,
		size: null,
		sex: 'unknown',
		has_chip: false,
		collar_described: false,
		event_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
		in_slovenia: true,
		photos: [],
		created_at: '2026-10-15T08:00:00Z',
		updated_at: '2026-10-15T08:00:00Z',
		is_mine: false,
	}));
	await page.route(/\/v1\/reports(\/map)?\?/, (route) => {
		const headers = { 'access-control-allow-origin': '*' };
		const map = new URL(route.request().url()).pathname.endsWith('/map');
		return route.fulfill({
			headers,
			json: map ? { items } : { items, next_cursor: null, total_estimate: items.length },
		});
	});
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/zemljevid');
	// The ad's own shift only (AC#4): the list replacing its skeleton is the page's, measured by Lighthouse.
	await expect(page.getByRole('link', { name: /Code8|, Izgubljena, /i }).nth(7)).toBeVisible();
	await page.evaluate(() => ((window as unknown as { cls: number }).cls = 0));

	const feed = page.locator('a[data-ad-slot="feed"]');
	await feed.scrollIntoViewIfNeeded();
	await expect(feed).toHaveAccessibleName(feedName);
	await expect(feed).toHaveAttribute('href', clickUrl('feed'));
	expect(seen.slots).toEqual(['feed']);
	expect(await cls()).toBeLessThan(0.1);
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
