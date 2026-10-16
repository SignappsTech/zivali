import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TASK-15.2: MapView on /dev/map (500 seeded public points, areas, a path) on real MapLibre, with its worker under the
// page CSP. OpenFreeMap is stubbed with empty tiles, so the spec runs offline and the same every time; set
// MAP_LIVE_TILES=1 to draw the real tiles instead. The CSP still applies: the browser checks it before routing.

const TILES = 'https://tiles.openfreemap.org';
const PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);
// Chrome DevTools' "Fast 4G" preset: 9 Mb/s down, 1.5 Mb/s up, 165 ms latency.
const FAST_4G = {
	offline: false,
	downloadThroughput: (9_000_000 / 8) * 0.9,
	uploadThroughput: (1_500_000 / 8) * 0.9,
	latency: 60 * 2.75,
};
// The "you" dot of the dev page: the viewer's own position must never leave the browser.
const ME = ['46.051', '14.469'];

async function stubTiles(page: Page, fail = false) {
	if (process.env.MAP_LIVE_TILES && !fail) return;
	await page.route(`${TILES}/**`, (route) => {
		if (fail) return route.abort('internetdisconnected');
		const { pathname } = new URL(route.request().url());
		const headers = { 'access-control-allow-origin': '*' };
		if (pathname === '/planet')
			return route.fulfill({
				headers,
				json: { tilejson: '3.0.0', tiles: [`${TILES}/planet/e2e/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 14 },
			});
		if (pathname.endsWith('.json')) return route.fulfill({ headers, json: {} }); // sprite index
		if (pathname.endsWith('.png')) return route.fulfill({ headers, body: PNG, contentType: 'image/png' });
		// Vector tiles and glyph ranges: empty, so the base map is blank.
		return route.fulfill({ headers, body: '', contentType: 'application/x-protobuf' });
	});
}

function consoleErrors(page: Page) {
	const errors: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') errors.push(message.text());
	});
	page.on('pageerror', (error) => errors.push(error.message));
	return errors;
}

const map = (page: Page) => page.locator('[data-slot=map-view]');
const clusters = (page: Page) => page.locator('[data-kind=cluster]');
const camera = (page: Page) => page.getByTestId('camera');

/**
 * A marker face (`kind`: cluster, found, …) whose centre is well inside the map box and not covered by another face:
 * faces exist for every feature in the loaded tiles, which reach past the visible map.
 */
async function faceInView(page: Page, kinds: string[]) {
	await map(page).scrollIntoViewIfNeeded(); // elementFromPoint sees the viewport only
	const faces = page.locator(kinds.map((kind) => `[data-kind=${kind}]`).join(', '));
	const index = await faces.evaluateAll((elements) => {
		const box = document.querySelector('[data-slot=map-view]')!.getBoundingClientRect();
		return elements.findIndex((element) => {
			const { x, y, width, height } = element.getBoundingClientRect();
			const [cx, cy] = [x + width / 2, y + height / 2];
			const inside = cx > box.left + 60 && cx < box.right - 60 && cy > box.top + 60 && cy < box.bottom - 60;
			return inside && element.contains(document.elementFromPoint(cx, cy));
		});
	});
	return index < 0 ? undefined : faces.nth(index);
}

/** The camera readout of the dev page once it stops: [lat, lng, zoom]. */
async function idleCamera(page: Page) {
	await expect(camera(page)).toHaveText(/ idle$/);
	const [point, zoom] = (await camera(page).textContent())!.split(' ');
	return [...point.split(',').map(Number), Number(zoom.slice(1))];
}

test('500 public points render as clusters within 2 s on a throttled 4G profile, the worker under the CSP (AC#4)', async ({
	page,
	context,
}, testInfo) => {
	const errors = consoleErrors(page);
	await stubTiles(page);
	const cdp = await context.newCDPSession(page);
	await cdp.send('Network.enable');
	await cdp.send('Network.emulateNetworkConditions', FAST_4G);
	// The page's own clock: when the first count disc is in the DOM.
	await page.addInitScript(() => {
		new MutationObserver((_, observer) => {
			if (!document.querySelector('[data-kind=cluster]')) return;
			(window as unknown as { clustersAt: number }).clustersAt = performance.now();
			observer.disconnect();
		}).observe(document, { childList: true, subtree: true });
	});
	await context.tracing.start({ screenshots: true, snapshots: true });

	const response = await page.goto('/en/dev/map');
	expect(response?.headers()['content-security-policy']).toContain("worker-src 'self'");
	await expect(clusters(page).first()).toBeVisible();
	await expect(map(page)).toHaveAttribute('data-state', 'ready');
	// The canvas fills the map box and the discs are drawn on top of it, not clipped away.
	const box = (await map(page).boundingBox())!;
	const canvas = (await page.getByRole('region', { name: 'Map: 500 reports' }).boundingBox())!;
	expect([canvas.width, canvas.height]).toEqual([box.width, box.height]);
	expect(await faceInView(page, ['cluster'])).toBeDefined();
	// From the moment MapView starts loading the map (its `mapview:load` mark: the maplibre-gl chunk, CSS, worker,
	// style and the 500 points) to the first count disc. The page's own JS before that is not the map's.
	const [loadAt, clustersAt] = await page.evaluate(() => [
		performance.getEntriesByName('mapview:load')[0].startTime,
		(window as unknown as { clustersAt: number }).clustersAt,
	]);

	const trace = testInfo.outputPath('trace.zip');
	await context.tracing.stop({ path: trace });
	await testInfo.attach('trace', { path: trace, contentType: 'application/zip' });
	testInfo.annotations.push({
		type: 'clusters drawn',
		description: `${Math.round(clustersAt - loadAt)} ms after MapView started loading, ${Math.round(clustersAt)} ms after navigation`,
	});
	expect(clustersAt - loadAt).toBeLessThan(2_000);

	// Every report is on the map, in a count disc or on its own.
	const counts = (await clusters(page).allTextContents()).map(Number);
	const singles = await page.locator('[data-kind]:not([data-kind=cluster]):not([data-kind=me])').count();
	expect(counts.reduce((sum, count) => sum + count, 0) + singles).toBe(500);
	await expect(page.getByRole('img', { name: 'You' })).toBeVisible();
	expect(errors).toEqual([]);
});

test('keyboard: "Skip map" jumps to the list; arrows pan, + and - zoom; the attribution stays visible (AC#3)', async ({
	page,
}) => {
	await stubTiles(page);
	await page.goto('/dev/map');
	await expect(clusters(page).first()).toBeVisible();

	const skip = page.getByRole('link', { name: 'Preskoči zemljevid' });
	await skip.focus();
	await expect(skip).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page.locator('[data-slot=map-view] + div')).toBeFocused();
	await expect(page.getByRole('heading', { name: /Zemljevid prijav v okolici kraja Slovenija/ })).toBeVisible();

	const region = page.getByRole('region', { name: 'Zemljevid: 500 prijav' });
	await expect(region).toHaveAccessibleDescription(
		'Zemljevid premikate s puščicami, povečate s tipko + in pomanjšate s tipko −.'
	);
	await region.focus();
	await page.keyboard.press('ArrowRight');
	await expect(camera(page)).toHaveText(/ idle$/);
	const [lat, lng, zoom] = await idleCamera(page);
	await page.keyboard.press('ArrowDown');
	await expect.poll(async () => (await idleCamera(page))[0]).toBeLessThan(lat);
	await page.keyboard.press('+');
	await expect.poll(async () => (await idleCamera(page))[2]).toBeCloseTo(zoom + 1, 0);
	await page.keyboard.press('-');
	await expect.poll(async () => (await idleCamera(page))[2]).toBeCloseTo(zoom, 0);
	expect((await idleCamera(page))[1]).toBeCloseTo(lng, 1);

	// Attribution: bottom-right of the map, on top of everything drawn there.
	const attribution = page.getByRole('link', { name: /© OpenFreeMap © OpenMapTiles/ });
	await expect(attribution).toBeVisible();
	const box = (await map(page).boundingBox())!;
	const link = (await attribution.boundingBox())!;
	expect(box.x + box.width - (link.x + link.width)).toBeCloseTo(8, 0);
	expect(box.y + box.height - (link.y + link.height)).toBeCloseTo(8, 0);
	const onTop = await attribution.evaluate((element) => {
		const { x, y, width, height } = element.getBoundingClientRect();
		return element.contains(document.elementFromPoint(x + width / 2, y + height / 2));
	});
	expect(onTop).toBe(true);
});

test('moveTo, onCameraChange, a cluster click and a marker press work on the real map', async ({ page }) => {
	await stubTiles(page);
	await page.goto('/en/dev/map');
	await expect(clusters(page).first()).toBeVisible();
	const [, , start] = await idleCamera(page);

	await (await faceInView(page, ['cluster']))!.click();
	await expect.poll(async () => (await idleCamera(page))[2]).toBeGreaterThan(start);

	await page.getByRole('button', { name: 'Ljubljana' }).click();
	await expect(camera(page)).toHaveText('46.0569,14.5058 z13.0 idle');

	// Press a lone marker in view (the faces follow once the new view's tiles are in).
	const kinds = ['lost', 'found', 'sighted', 'reunited'];
	await expect.poll(async () => Boolean(await faceInView(page, kinds))).toBe(true);
	const single = (await faceInView(page, kinds))!;
	const name = (await single.getAttribute('aria-label'))!;
	expect(name).toMatch(/^#\d+, (lost|found|sighted|reunited)\b/);
	await single.click();
	await expect(page.getByTestId('pressed')).toHaveText(`r${name.slice(1, name.indexOf(','))}`);
});

test('only the app and OpenFreeMap tiles are requested; the viewer position never leaves the browser (C6)', async ({
	page,
}) => {
	const urls: string[] = [];
	page.on('request', (request) => urls.push(request.url()));
	await stubTiles(page);
	await page.goto('/en/dev/map');
	await expect(clusters(page).first()).toBeVisible();
	await page.getByRole('button', { name: 'Ljubljana' }).click();
	await expect(camera(page)).toHaveText(/ idle$/);

	const origin = new URL(page.url()).origin;
	expect(urls.filter((url) => !url.startsWith(origin) && !url.startsWith(`${TILES}/`))).toEqual([]);
	expect(urls.filter((url) => ME.some((part) => url.includes(part)))).toEqual([]);
	expect(urls.some((url) => url.startsWith(`${TILES}/`))).toBe(true);
	expect(urls.some((url) => /\/_next\/static\/media\/maplibre-gl-worker\.[\w-]+\.mjs$/.test(url))).toBe(true);
});

test('when the tiles cannot load, the map says so and the list stays', async ({ page }) => {
	await stubTiles(page, true);
	await page.goto('/en/dev/map');
	await expect(map(page)).toHaveAttribute('data-state', 'error');
	await expect(map(page).getByRole('status')).toHaveText('The map cannot load right now. Reports are in the list.');
	await expect(page.getByRole('heading', { name: /Map of reports around Slovenija/ })).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const)
	test(`/dev/map in ${colorScheme} has no axe violations`, async ({ page }) => {
		await page.emulateMedia({ colorScheme });
		await stubTiles(page);
		await page.goto('/dev/map');
		await expect(clusters(page).first()).toBeVisible();
		const { violations } = await new AxeBuilder({ page }).analyze();
		expect(
			violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
		).toEqual([]);
	});
