import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Request, test } from '@playwright/test';

import { ownerReport } from '@zivali/api/__fixtures__/reports';

import { signInAs } from './session';

// TASK-17.2: the P7 manage page from the private link (C7) and the /captcha WebView host (C15). The browser's calls
// are answered here: GoTrue's anonymous sign-in (POST /auth/v1/signup) and the API (claim, report, conversations).
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const ACCESS_TOKEN = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub: 'anon-1', is_anonymous: true, exp }), 'e2e'].join(
	'.'
);

/** Answers the browser's GoTrue and API calls (CORS preflights pass); returns the API requests it saw. */
async function answer(page: Page, claim: { status: number; body: object }, report = ownerReport) {
	const seen: Request[] = [];
	const answers: Record<string, () => { status: number; body: object }> = {
		'POST /auth/v1/signup': () => ({
			status: 200,
			body: {
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
		}),
		'POST /v1/manage/claim': () => claim,
		[`GET /v1/reports/${report.short_code}`]: () => ({ status: 200, body: report }),
		'GET /v1/conversations': () => ({ status: 200, body: { items: [], next_cursor: null } }),
	};
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
			if (new URL(request.url()).pathname.startsWith('/v1/')) seen.push(request);
			const reply = answers[`${request.method()} ${new URL(request.url()).pathname}`]?.() ?? {
				status: 404,
				body: { error: { code: 'NOT_FOUND', message: 'no answer' } },
			};
			return route.fulfill({ status: reply.status, json: reply.body, headers: cors });
		}
	);
	return seen;
}

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

for (const viewport of [
	{ width: 390, height: 844 },
	{ width: 1440, height: 900 },
]) {
	test(`/m signs in anonymously, claims the link and shows the report (${viewport.width} px)`, async ({ page }) => {
		await page.setViewportSize(viewport);
		const seen = await answer(page, {
			status: 200,
			body: { report_id: ownerReport.id, short_code: ownerReport.short_code },
		});
		await page.goto('/m#good-token');

		await expect(page.getByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeVisible();
		await expect(page.getByText('Najdena')).toBeVisible();
		// TASK-17.7: the Edit row links to the edit page (opened in the next test).
		await expect(page.getByRole('link', { name: 'Uredi prijavo' })).toHaveAttribute(
			'href',
			`/r/${ownerReport.short_code}/uredi`
		);
		await expect(page.getByRole('button', { name: 'Žival je spet doma' })).toBeVisible();
		expect(await page.title()).toBe('Vaša prijava · Najdimo');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');

		const claim = seen.find((request) => new URL(request.url()).pathname === '/v1/manage/claim')!;
		expect(claim.postDataJSON()).toEqual({ token: 'good-token' });
		expect(claim.headers().authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
		// Every API request carries this browser's device id (C7).
		const ids = new Set(seen.map((request) => request.headers()['x-device-id']));
		expect([...ids]).toEqual([expect.stringMatching(/^[0-9a-f-]{36}$/)]);
		// The token never goes into a request URL or Referer, and leaves the address bar and history at once.
		expect(seen.every((request) => !request.url().includes('good-token'))).toBe(true);
		await expect(page).toHaveURL(/\/m$/);

		// Protected flow (C15): no ad slot.
		await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
		await expectNoAxeViolations(page);

		// A reload in the same tab claims again from the tab's stash.
		await page.reload();
		await expect(page.getByRole('heading', { level: 1, name: 'Vaša prijava' })).toBeVisible();
		expect(seen.filter((request) => new URL(request.url()).pathname === '/v1/manage/claim')).toHaveLength(2);
	});
}

// TASK-17.7 AC#1: the Edit row opens the edit page, which the e2e API (mock-api.ts, Mine1234) answers as the manager's.
test('/m: the Edit row opens the edit page with an editable description', async ({ page, baseURL }) => {
	await signInAs(page, { id: '0b5f6a3e-6c1d-4f8e-9a2b-3c4d5e6f7a80', role: 'USER', aal: 'aal1' }, baseURL!);
	await answer(
		page,
		{ status: 200, body: { report_id: ownerReport.id, short_code: 'Mine1234' } },
		{ ...ownerReport, short_code: 'Mine1234' }
	);
	await page.goto('/m#good-token');
	await page.getByRole('link', { name: 'Uredi prijavo' }).click();

	await expect(page).toHaveURL(/\/r\/Mine1234\/uredi$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uredi prijavo');
	await expect(page.getByLabel('Opis okoliščin (neobvezno)')).toBeEditable();
});

// TASK-17.4 AC#2: Close sends the neutral reason `other` (C4, TASK-17.5); resend without an email on file says so (C7).
test('/m: Close sends reason other; resend without an email on file says so', async ({ page }) => {
	await answer(page, { status: 200, body: { report_id: ownerReport.id, short_code: ownerReport.short_code } });
	const cors = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': '*',
		'Access-Control-Allow-Methods': '*',
	};
	const bodies: unknown[] = [];
	await page.route(
		(url) => url.pathname.endsWith('/transitions') || url.pathname.endsWith('/manage-link/resend'),
		(route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
			if (request.url().endsWith('/transitions')) {
				bodies.push(request.postDataJSON());
				return route.fulfill({
					status: 200,
					headers: cors,
					json: { ...ownerReport, status: 'closed', closed_at: new Date().toISOString() },
				});
			}
			return route.fulfill({
				status: 409,
				headers: cors,
				json: { error: { code: 'CONFLICT', message: 'no email' } },
			});
		}
	);
	await page.goto('/m#good-token');
	await page.getByRole('button', { name: 'Pošljite mi zasebno povezavo' }).click();
	await expect(page.getByText('Ob prijavi niste navedli e-naslova')).toBeVisible();
	await page.getByRole('button', { name: 'Zaključi prijavo' }).click();
	await expect.poll(() => bodies).toEqual([{ action: 'close', reason: 'other' }]);
});

test('/en/m says an unknown link no longer works', async ({ page }) => {
	await answer(page, { status: 404, body: { error: { code: 'NOT_FOUND', message: 'unknown token' } } });
	await page.goto('/en/m#unknown');
	await expect(page.getByRole('heading', { level: 1, name: 'This link no longer works' })).toBeFocused();
	await expect(page.locator('[data-ad-slot]')).toHaveCount(0);
	await expectNoAxeViolations(page);
});

test('/captcha posts the result to the app WebView (captcha off: a null token)', async ({ page }) => {
	await page.addInitScript(() => {
		const messages: string[] = [];
		Object.assign(window, {
			messages,
			ReactNativeWebView: { postMessage: (message: string) => messages.push(message) },
		});
	});
	const response = await page.goto('/captcha?lang=en');
	expect(response?.headers()['content-security-policy']).toContain('frame-src https://challenges.cloudflare.com');
	await expect(page.getByRole('heading', { level: 1, name: 'A quick check' })).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => (window as unknown as { messages: string[] }).messages))
		.toEqual([JSON.stringify({ type: 'captcha', token: null })]);
});
