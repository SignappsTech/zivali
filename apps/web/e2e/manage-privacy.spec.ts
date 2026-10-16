import { expect, type Page, type Request, test } from '@playwright/test';

import { CONSENT_VERSION } from '@zivali/analytics';
import { ownerReport } from '@zivali/api/__fixtures__/reports';

// TASK-17.4 (QA): the manage token (C7) with analytics granted never reaches a request URL, a Referer, a request body
// other than the claim, an analytics call, the cookies or the history; and the manage page works at 320 px by keyboard.
const TOKEN = 'qaSecretTok3n_abcdefghijklmnopqrstuvwxyz0123';
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const ACCESS_TOKEN = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub: 'anon-1', is_anonymous: true, exp }), 'e2e'].join(
	'.'
);

/** Answers GoTrue's anonymous sign-in and the API, and every request off localhost; returns every request seen. */
async function answer(page: Page) {
	const all: Request[] = [];
	page.on('request', (request) => all.push(request));
	const answers: Record<string, object> = {
		'POST /auth/v1/signup': {
			access_token: ACCESS_TOKEN,
			token_type: 'bearer',
			expires_in: 3600,
			expires_at: exp,
			refresh_token: 'e2e',
			user: {
				id: 'anon-1',
				aud: 'authenticated',
				role: 'authenticated',
				is_anonymous: true,
				app_metadata: {},
				user_metadata: {},
				created_at: new Date().toISOString(),
			},
		},
		'POST /v1/manage/claim': { report_id: ownerReport.id, short_code: ownerReport.short_code },
		[`GET /v1/reports/${ownerReport.short_code}`]: ownerReport,
		'GET /v1/conversations': { items: [], next_cursor: null },
	};
	await page.context().route(
		(url) => url.hostname !== 'localhost',
		(route) => route.fulfill({ contentType: 'text/javascript', body: '' })
	);
	await page.route(
		(url) => url.pathname.startsWith('/v1/') || url.pathname === '/auth/v1/signup',
		(route) => {
			const request = route.request();
			const cors = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
			};
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
			const body = answers[`${request.method()} ${new URL(request.url()).pathname}`];
			return route.fulfill({
				status: body ? 200 : 404,
				json: body ?? { error: { code: 'NOT_FOUND', message: 'no answer' } },
				headers: cors,
			});
		}
	);
	return all;
}

test.describe('with analytics granted', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('/m keeps the token out of requests, analytics calls, cookies and history', async ({ page }) => {
		const value = encodeURIComponent(
			JSON.stringify({ v: CONSENT_VERSION, analytics: true, ts: new Date().toISOString() })
		);
		await page.context().addCookies([{ name: 'zz_consent', value, domain: 'localhost', path: '/' }]);
		// Every gtag() call: the GA4 adapter keeps a dataLayer that already exists.
		await page.addInitScript(() => {
			const calls: string[] = [];
			const layer: unknown[] = [];
			const push = layer.push.bind(layer);
			layer.push = (...items: unknown[]) => {
				calls.push(JSON.stringify(items.map((item) => Array.from(item as ArrayLike<unknown>))));
				return push(...items);
			};
			Object.assign(window, { dataLayer: layer, gtagCalls: calls });
		});
		const all = await answer(page);

		await page.goto(`/m#${TOKEN}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeVisible();
		await page.waitForLoadState('networkidle');
		expect(page.url()).not.toContain(TOKEN);

		const calls = await page.evaluate(() => (window as unknown as { gtagCalls: string[] }).gtagCalls);
		expect(calls.some((call) => call.includes('page_view'))).toBe(true);
		expect(calls.filter((call) => call.includes(TOKEN))).toEqual([]);
		expect(calls).toContainEqual(expect.stringContaining('"page_location":"http://localhost'));
		expect(calls.find((call) => call.includes('page_location'))).toMatch(/"page_location":"http:\/\/[^"]+\/m"/);

		const leaks = all.filter((request) => {
			const claim = new URL(request.url()).pathname === '/v1/manage/claim';
			return (
				request.url().includes(TOKEN) ||
				(request.headers()['referer'] ?? '').includes(TOKEN) ||
				(!claim && (request.postData() ?? '').includes(TOKEN))
			);
		});
		expect(leaks.map((request) => request.url())).toEqual([]);

		expect((await page.context().cookies()).filter((cookie) => cookie.value.includes(TOKEN))).toEqual([]);
		expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(TOKEN);
		await page.goto('/en/about');
		await page.goBack();
		expect(page.url()).not.toContain(TOKEN);
	});
});

test('/m at 320 px: no horizontal scroll, 44 px targets, every action reachable by keyboard', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await answer(page);
	await page.goto(`/m#${TOKEN}`);
	await expect(page.getByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeVisible();

	expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(
		0
	);
	const small = await page.evaluate(() =>
		[...document.querySelectorAll('main a, main button')]
			.map((el) => ({ name: (el.textContent ?? '').trim(), box: el.getBoundingClientRect() }))
			.filter(({ box }) => box.width > 0 && (box.height < 44 || box.width < 44))
			.map(({ name }) => name)
	);
	expect(small).toEqual([]);

	const reached: string[] = [];
	for (let i = 0; i < 12; i++) {
		await page.keyboard.press('Tab');
		reached.push(await page.evaluate(() => (document.activeElement?.textContent ?? '').trim()));
	}
	// TODO(TASK-26.4): 'Uredi prijavo' joins these when the Edit row comes back (manage-view.tsx).
	for (const name of ['Sporočila', 'Zaključi prijavo', 'Žival je spet doma']) expect(reached).toContain(name);

	await page.getByRole('button', { name: 'Žival je spet doma' }).focus();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('alertdialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('alertdialog')).toBeHidden();
});
