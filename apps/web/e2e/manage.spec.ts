import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Request, test } from '@playwright/test';

import { ownerReport } from '@zivali/api/__fixtures__/reports';

// TASK-17.2: the P7 manage page from the private link (C7) and the /captcha WebView host (C15). The browser's calls
// are answered here: GoTrue's anonymous sign-in (POST /auth/v1/signup) and the API (claim, report, conversations).
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 3600;
const ACCESS_TOKEN = [b64({ alg: 'HS256', typ: 'JWT' }), b64({ sub: 'anon-1', is_anonymous: true, exp }), 'e2e'].join(
	'.'
);

/** Answers the browser's GoTrue and API calls (CORS preflights pass); returns the API requests it saw. */
async function answer(page: Page, claim: { status: number; body: object }) {
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
		[`GET /v1/reports/${ownerReport.short_code}`]: () => ({ status: 200, body: ownerReport }),
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
		// TODO(TASK-26.4): the Edit row is hidden until the detail page has owner actions (manage-view.tsx).
		await expect(page.getByRole('link', { name: 'Uredi prijavo' })).toHaveCount(0);
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
