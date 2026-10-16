import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '@playwright/test';

// TASK-31.4: P4 web map and list (/zemljevid, /en/map) against stubbed report endpoints (the browser calls them, so
// page.route answers) and empty OpenFreeMap tiles, as in map.spec.ts. 500 public points spread over Slovenia.

const TILES = 'https://tiles.openfreemap.org';
// Chrome DevTools' "Fast 4G" preset: 9 Mb/s down, 1.5 Mb/s up, 165 ms latency.
const FAST_4G = {
	offline: false,
	downloadThroughput: (9_000_000 / 8) * 0.9,
	uploadThroughput: (1_500_000 / 8) * 0.9,
	latency: 60 * 2.75,
};
const TYPES = ['lost', 'found', 'sighted'] as const;
// The browser position granted in the location test; it must never leave the browser unrounded.
const HERE = { latitude: 46.051234, longitude: 14.506789 };

function random(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const next = random(31);
const PINS = Array.from({ length: 500 }, (_, i) => ({
	id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
	short_code: `Code${i + 1}`,
	type: TYPES[i % 3],
	species: i % 2 ? 'cat' : 'dog',
	area: { lat: 45.5 + next() * 1.2, lng: 13.7 + next() * 2.6, radius_m: 500 },
	boosted: i === 0,
	thumb_url: null,
}));
const report = (pin: (typeof PINS)[number]) => ({
	...pin,
	status: 'open',
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
});

async function stubTiles(page: Page) {
	await page.route(`${TILES}/**`, (route) => {
		const headers = { 'access-control-allow-origin': '*' };
		const { pathname } = new URL(route.request().url());
		if (pathname === '/planet')
			return route.fulfill({
				headers,
				json: { tilejson: '3.0.0', tiles: [`${TILES}/planet/e2e/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 14 },
			});
		if (pathname.endsWith('.json')) return route.fulfill({ headers, json: {} });
		return route.fulfill({ headers, body: '', contentType: 'application/x-protobuf' });
	});
}

/** GET /v1/reports (20 a page, offset cursor) and /v1/reports/map, filtered by `types`; every query is recorded. */
async function stubReports(page: Page) {
	const urls: URL[] = [];
	const answer = async (route: Route) => {
		const url = new URL(route.request().url());
		urls.push(url);
		const types = url.searchParams.get('types')?.split(',');
		const pins = PINS.filter((pin) => !types || types.includes(pin.type));
		const headers = { 'access-control-allow-origin': '*' };
		if (url.pathname.endsWith('/map')) return route.fulfill({ headers, json: { items: pins } });
		const start = Number(url.searchParams.get('cursor') ?? 0);
		return route.fulfill({
			headers,
			json: {
				items: pins.slice(start, start + 20).map(report),
				next_cursor: start + 20 < pins.length ? String(start + 20) : null,
				total_estimate: pins.length,
			},
		});
	};
	await page.route(/\/v1\/reports(\/map)?\?/, answer);
	return urls;
}

const clusters = (page: Page) => page.locator('[data-kind=cluster]');

test('500 reports draw as clusters within 2 s on a throttled 4G profile; map and list agree (AC#1)', async ({
	page,
	context,
}, testInfo) => {
	await stubTiles(page);
	await stubReports(page);
	const cdp = await context.newCDPSession(page);
	await cdp.send('Network.enable');
	await cdp.send('Network.emulateNetworkConditions', FAST_4G);
	await page.addInitScript(() => {
		new MutationObserver((_, observer) => {
			if (!document.querySelector('[data-kind=cluster]')) return;
			(window as unknown as { clustersAt: number }).clustersAt = performance.now();
			observer.disconnect();
		}).observe(document, { childList: true, subtree: true });
	});

	await page.goto('/en/map');
	await expect(clusters(page).first()).toBeVisible();
	const [loadAt, clustersAt] = await page.evaluate(() => [
		performance.getEntriesByName('mapview:load')[0].startTime,
		(window as unknown as { clustersAt: number }).clustersAt,
	]);
	testInfo.annotations.push({
		type: 'clusters drawn',
		description: `${Math.round(clustersAt - loadAt)} ms after MapView started loading, ${Math.round(clustersAt)} ms after navigation`,
	});
	expect(clustersAt - loadAt).toBeLessThan(2_000);
	// Lost, found and sighted, each with its icon and word in the accessible name.
	await expect(page.getByText('500 reports').first()).toBeVisible();
	await expect(page.getByRole('region', { name: 'Map: 500 reports' })).toBeVisible();
	await expect(page.getByRole('link', { name: /, Lost, / }).first()).toBeVisible();
});

test('filters narrow map and list, live in the URL and survive a reload (AC#3)', async ({ page }) => {
	await stubTiles(page);
	const urls = await stubReports(page);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/en/map?type=lost');
	await expect(page.getByText('167 reports')).toBeVisible();
	expect(urls.every((url) => url.searchParams.get('types') === 'lost')).toBe(true);

	await page.getByRole('button', { name: 'Filters' }).click();
	const drawer = page.getByRole('dialog', { name: 'Filters' });
	await expect(drawer.getByRole('button', { name: 'Lost' })).toHaveAttribute('aria-pressed', 'true');
	await drawer.getByRole('button', { name: 'Found' }).click();
	await drawer.getByRole('radio', { name: 'Last 24 hours' }).click();
	await drawer.getByRole('button', { name: 'Show 334 reports' }).click();
	await expect(page).toHaveURL(/\/en\/map\?type=lost,found&when=24h$/);
	await expect(page.getByText('Lost and found · dogs and cats · last 24 hours · 10 km')).toBeVisible();

	await page.reload();
	await expect(page.getByText('334 reports')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Load more' })).toBeVisible();
});

test('the list is the keyboard alternative: skip the map, open a report row (AC#2)', async ({ page }) => {
	await stubTiles(page);
	await stubReports(page);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto('/zemljevid');
	const first = page.getByRole('link', { name: /^Izgubljen pes, Izgubljena, / }).first();
	await expect(first).toBeVisible();
	await first.focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/r\/Code1$/);
});

test('a granted browser position is rounded to 2 decimals in requests and stays out of the page URL (C6)', async ({
	page,
	context,
}) => {
	await context.grantPermissions(['geolocation']);
	await context.setGeolocation(HERE);
	await stubTiles(page);
	const urls = await stubReports(page);
	const sent: string[] = [];
	page.on('request', (request) => sent.push(`${request.url()} ${request.postData() ?? ''}`));
	await page.goto('/en/map');
	await expect(page.getByRole('button', { name: 'Sort: Nearest' }).first()).toBeAttached();
	await expect.poll(() => urls.some((url) => url.searchParams.get('near') === '46.05,14.51,10')).toBe(true);
	expect(sent.filter((line) => /46\.051|14\.506/.test(line))).toEqual([]);
	expect(page.url()).not.toMatch(/46\.|14\./);
});

for (const [name, viewport] of Object.entries({
	mobile: { width: 390, height: 844 },
	desktop: { width: 1440, height: 900 },
}))
	test(`/zemljevid @${name} has no axe violations, with the filters open too`, async ({ page }) => {
		await stubTiles(page);
		await stubReports(page);
		await page.setViewportSize(viewport);
		await page.goto('/zemljevid');
		await expect(clusters(page).first()).toBeVisible();
		const scan = async () =>
			(await new AxeBuilder({ page }).analyze()).violations.map(
				({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`
			);
		expect(await scan()).toEqual([]);
		await page
			.getByRole('button', { name: name === 'mobile' ? /^Območje: / : 'Filtri' })
			.first()
			.click();
		await expect(page.getByRole('dialog', { name: 'Filtri' })).toBeVisible();
		expect(await scan()).toEqual([]);
	});
