import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// TASK-15.3: the web LocationPicker on /dev/location over real MapLibre. OpenFreeMap is stubbed with empty tiles and
// the C6 geocoder (POST /v1/geo/search, /v1/geo/reverse) with fixtures, so the spec runs offline and the same every
// time. What leaves the picker is read from the page's onChange readout.

const TILES = 'https://tiles.openfreemap.org';
const TRUBARJEVA = { label: 'Trubarjeva cesta, Ljubljana', lat: 46.05231, lng: 14.50952 };
const PLACES = [
	{
		label: 'Trubarjeva cesta 5, Ljubljana',
		lat: 46.05169,
		lng: 14.50701,
		kind: 'address',
		municipality_slug: 'ljubljana',
	},
	{ ...TRUBARJEVA, kind: 'street', municipality_slug: 'ljubljana' },
];
const SISKA = {
	label: 'Šiška, Ljubljana',
	lat: 46.0739,
	lng: 14.4851,
	kind: 'district',
	municipality_slug: 'ljubljana',
};
const FIX = { latitude: 46.0561, longitude: 14.5122 };

async function stub(page: Page) {
	const headers = { 'access-control-allow-origin': '*' };
	await page.route(`${TILES}/**`, (route) => {
		const { pathname } = new URL(route.request().url());
		if (pathname === '/planet')
			return route.fulfill({
				headers,
				json: { tilejson: '3.0.0', tiles: [`${TILES}/planet/e2e/{z}/{x}/{y}.pbf`], minzoom: 0, maxzoom: 14 },
			});
		if (pathname.endsWith('.json')) return route.fulfill({ headers, json: {} }); // sprite index
		// Sprite image, vector tiles and glyph ranges: empty, so the base map is blank.
		return route.fulfill({ headers, body: '', contentType: 'application/x-protobuf' });
	});
	// The preflight goes on to e2e/mock-api.ts, which answers CORS for any path.
	await page.route(/\/v1\/geo\/(search|reverse)$/, (route) =>
		route.request().method() === 'OPTIONS'
			? route.continue()
			: route.fulfill({
					headers,
					json: route.request().url().endsWith('/search') ? { items: PLACES } : { place: SISKA },
				})
	);
}

const metres = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) =>
	Math.hypot((b.lng - a.lng) * Math.cos(((a.lat + b.lat) * Math.PI) / 360), b.lat - a.lat) * 111_320;

/** What the picker handed onChange, once Confirm was pressed. */
async function picked(page: Page) {
	await expect(page.getByTestId('picked')).not.toBeEmpty();
	return JSON.parse((await page.getByTestId('picked').textContent())!) as {
		point: { lat: number; lng: number };
		radiusM?: number;
		source: string;
	};
}

async function open(page: Page, path: string) {
	await stub(page);
	await page.goto(path);
	await expect(page.locator('[data-slot=map-view]')).toHaveAttribute('data-state', 'ready');
	await expect(page.getByText('Šiška, Ljubljana')).toBeVisible();
}

test('keyboard only: search, pick a result, set the radius, confirm; only the coarsened point leaves (AC#4, AC#5)', async ({
	page,
}) => {
	await open(page, '/en/dev/location');
	const field = page.getByRole('combobox', { name: 'Search for a place' });
	await field.focus();
	await page.keyboard.type('trubarjeva');
	await expect(page.getByRole('option')).toHaveCount(2);
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(page.getByText(TRUBARJEVA.label)).toBeVisible();
	await expect(field).toHaveValue('');

	const slider = page.getByRole('slider', { name: 'Search area' });
	await slider.focus();
	await page.keyboard.press('ArrowRight');
	await expect(slider).toHaveAttribute('aria-valuetext', 'Radius 750 m');
	await page.getByRole('spinbutton', { name: 'Radius in metres' }).fill('1900');
	await page.keyboard.press('Tab');
	await expect(slider).toHaveAttribute('aria-valuetext', 'Radius 2 km');

	await page.getByRole('button', { name: 'Confirm location' }).focus();
	await page.keyboard.press('Enter');
	const { point, radiusM, source } = await picked(page);
	expect([radiusM, source]).toEqual([2000, 'search']);
	expect(metres(point, TRUBARJEVA)).toBeGreaterThan(19.9);
	expect(metres(point, TRUBARJEVA)).toBeLessThan(30.1);
});

test('Use my location: a granted fix moves the map, and Confirm sends it coarsened (AC#1, AC#5)', async ({
	page,
	context,
}) => {
	await context.grantPermissions(['geolocation']);
	await context.setGeolocation(FIX);
	await open(page, '/en/dev/location?mode=found');
	// Once the map has stopped on the fix, the picker looks its name up: the point is still the GPS one.
	const lookup = page.waitForRequest(
		(request) =>
			request.method() === 'POST' &&
			request.url().endsWith('/v1/geo/reverse') &&
			request.postDataJSON().lat === FIX.latitude
	);
	await page.getByRole('button', { name: 'Use my location' }).click();
	await lookup;
	await page.getByRole('button', { name: 'Confirm location' }).click();
	const { point, radiusM, source } = await picked(page);
	expect([radiusM, source]).toEqual([undefined, 'gps']);
	const raw = { lat: FIX.latitude, lng: FIX.longitude };
	expect(metres(point, raw)).toBeGreaterThan(19.9);
	expect(metres(point, raw)).toBeLessThan(30.1);
});

test('"Not now" in the primer: the screen explains why, search and the map still work (AC#2)', async ({ page }) => {
	await open(page, '/en/dev/location');
	await page.getByRole('button', { name: 'Use my location' }).click();
	const primer = page.getByRole('dialog', { name: 'Where did it happen?' });
	await expect(primer).toBeVisible();
	await primer.getByRole('button', { name: 'Not now' }).click();
	await expect(page.getByText('We could not get your location. Search for the place or move the map.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Use my location' })).toHaveCount(0);
	await page.getByRole('combobox', { name: 'Search for a place' }).fill('trubarjeva');
	await expect(page.getByRole('option')).toHaveCount(2);
});

for (const [name, path] of [
	['lost, light', '/dev/location'],
	['alert, dark', '/dev/location?mode=alert'],
	['stored point with the photo location, dark', '/dev/location?mode=sighted&stored=1&exif=1'],
] as const)
	test(`/dev/location (${name}) has no axe violations, results open too (AC#4)`, async ({ page }) => {
		await page.emulateMedia({ colorScheme: name.endsWith('dark') ? 'dark' : 'light' });
		await open(page, path);
		const check = async () => {
			const { violations } = await new AxeBuilder({ page }).analyze();
			expect(
				violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
			).toEqual([]);
		};
		await check();
		await page.getByRole('combobox', { name: 'Iskanje kraja' }).fill('trubarjeva');
		await expect(page.getByRole('option')).toHaveCount(2);
		await check();
	});
