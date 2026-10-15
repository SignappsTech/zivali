import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { CONSENT_VERSION } from '@zivali/analytics';

// TASK-9.3: P16 sign-in, sign-up and reset on web (flow variant), SL and EN, 390 and 1440 px, light and dark; the
// server guards' `next`. Supabase Auth is answered here (the run has no Supabase): the browser calls it directly.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

/** Protected flow (C15): no ad slot renders (as tests/quality/guards.mjs expectNoAdSlots, which has no types). */
const expectNoAdSlots = (page: Page) => expect(page.locator('[data-ad-slot]')).toHaveCount(0);

async function expectNoAxeViolations(page: Page) {
	await page.waitForFunction(() =>
		document
			.getAnimations()
			.every((animation) => !(animation instanceof CSSTransition) || animation.playState === 'finished')
	);
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

/**
 * Answers one GoTrue endpoint (`token`, `signup`, `recover`) in its error shape (`error_code`), which supabase-js maps
 * and @zivali/api/auth turns into C1 codes; the answers go out in turn, the last one repeats. CORS preflights pass.
 */
async function answerAuth(page: Page, endpoint: string, ...answers: { status: number; body: object }[]) {
	let call = 0;
	await page.route(
		(url) => url.href.startsWith(SUPABASE) && url.pathname === `/auth/v1/${endpoint}`,
		(route) => {
			const cors = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': route.request().headers()['access-control-request-headers'] ?? '*',
			};
			if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
			const { status, body } = answers[Math.min(call++, answers.length - 1)]!;
			return route.fulfill({ status, json: body, headers: cors });
		}
	);
}

// A cookie choice already made (P17), so the consent banner does not cover the forms at 390 px.
test.beforeEach(({ context }) =>
	context.addCookies([
		{
			name: 'zz_consent',
			value: encodeURIComponent(
				JSON.stringify({ v: CONSENT_VERSION, analytics: false, ts: new Date().toISOString() })
			),
			domain: 'localhost',
			path: '/',
		},
	])
);

for (const [width, colorScheme] of [
	[1440, 'light'],
	[390, 'dark'],
] as const)
	test(`sign-in at ${width} in ${colorScheme}: flow shell, noindex, no ads, no axe violations`, async ({ page }) => {
		await page.emulateMedia({ colorScheme });
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/vpis');

		await expect(page).toHaveTitle('Vpis · Najdimo');
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Vpišite se');
		// Flow variant: logo and "Zapri", no main navigation, no sidebar.
		await expect(page.getByRole('banner').getByRole('link', { name: 'Zapri' })).toBeVisible();
		await expect(page.getByRole('navigation', { name: 'Glavni meni' })).toHaveCount(0);
		await expect(page.getByRole('complementary')).toHaveCount(0);
		await expectNoAdSlots(page);
		await expectNoAxeViolations(page);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
	});

test('a wrong pair gets one message for the whole form; Enter submits', async ({ page }) => {
	await answerAuth(page, 'token', {
		status: 400,
		body: { error_code: 'invalid_credentials', msg: 'Invalid login credentials' },
	});
	await page.goto('/vpis?next=%2Fracun');
	await page.getByLabel('E-naslov').fill('ana@example.si');
	await page.getByLabel('Geslo', { exact: true }).fill('napacno-geslo');
	await page.keyboard.press('Enter');

	await expect(page.getByRole('main').getByRole('alert')).toHaveText('E-naslov ali geslo ni pravilno.');
	await expect(page.getByLabel('E-naslov')).toHaveValue('ana@example.si');
	await page.getByRole('button', { name: 'Pokaži geslo' }).click();
	await expect(page.getByLabel('Geslo', { exact: true })).toHaveAttribute('type', 'text');
	await expect(page.getByRole('button', { name: 'Skrij geslo' })).toBeVisible();
	await expectNoAxeViolations(page);
});

test('sign-up: a taken address looks like a new one (check your email), in English', async ({ page }) => {
	await answerAuth(page, 'signup', {
		status: 422,
		body: { error_code: 'user_already_exists', msg: 'User already registered' },
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/en/sign-up');
	await expect(page).toHaveTitle('Create an account · Najdimo');

	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByLabel('Name')).toBeFocused();
	await expect(page.getByRole('main').getByRole('alert')).toHaveCount(3);
	await expectNoAxeViolations(page);

	await page.getByLabel('Name').fill('Ana');
	await page.getByLabel('Email address').fill('ana@example.si');
	await page.getByLabel('Password', { exact: true }).fill('cat in boots');
	await page.getByRole('button', { name: 'Create account' }).click();

	await expect(page.getByRole('heading', { level: 1, name: 'Check your email' })).toBeFocused();
	await expect(page.getByText('We have sent a link to ana@example.si.', { exact: false })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Resend' })).toBeDisabled();
	await expect(page.getByText('You can resend in 60 s.')).toBeVisible();
	await expectNoAxeViolations(page);
});

test('reset: the same answer for every address, then the rate-limit note on a repeat', async ({ page }) => {
	await answerAuth(
		page,
		'recover',
		{ status: 200, body: {} },
		{ status: 429, body: { error_code: 'over_email_send_rate_limit', msg: 'For security purposes…' } }
	);
	await page.goto('/en/reset-password?email=ana%40example.si');
	await expect(page).toHaveTitle('Forgot password · Najdimo');
	const send = page.getByRole('button', { name: 'Send link' });

	await send.click();
	await expect(page.getByRole('main').getByRole('status')).toHaveText(/If there is an account for this address/);
	await send.click();
	await expect(page.getByRole('main').getByRole('status')).toHaveText(
		'Too many attempts. Please try again in a few minutes.'
	);
	await expect(send).toBeDisabled();
	await expectNoAdSlots(page);
	await expectNoAxeViolations(page);
});

test('the new-password form needs a reset link: a plain visit gets the reset form', async ({ page }) => {
	await page.goto('/pozabljeno-geslo?link=expired');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pozabljeno geslo');
	await expect(page.getByRole('main').getByRole('status')).toContainText('Povezava ne deluje več');
	await expect(page.getByLabel('Novo geslo')).toHaveCount(0);
});

for (const [path, target] of [
	['/racun', '/vpis?next=%2Fracun'],
	['/en/account/alerts', '/en/sign-in?next=%2Fen%2Faccount%2Falerts'],
	['/racun/placila', '/vpis?next=%2Fracun%2Fplacila'],
])
	test(`signed out, ${path} goes to sign-in and back`, async ({ request }) => {
		const response = await request.get(path, { maxRedirects: 0 });

		expect(response.status()).toBe(307);
		expect(response.headers()['location']).toBe(target);
	});
