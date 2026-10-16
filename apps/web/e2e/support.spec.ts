import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { me } from '@zivali/api/__fixtures__/me';
import { payment } from '@zivali/api/__fixtures__/payments';
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };
import type { CheckoutInput, Payment } from '@zivali/types';

import { api, dismissConsent, hydrated, signInAs } from './session';

// TASK-33.2: the P15 asks on web with the C13 mock provider. e2e/mock-api.ts keeps its own report Tip12345 in
// memory (not Mine1234, which lifecycle.spec.ts uses); the browser's payment calls are answered here, and /dev/checkout posts the signed webhook from the server.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const OWNER = { id: '0b5f6a3e-6c1d-4f8e-9a2b-3c4d5e6f7a80', role: 'USER', aal: 'aal1' } as const;
const ID = payment.id;
const t = sl.support;

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

/**
 * Answers GET /v1/me and the payment calls (the payment's status read from `state`), records each checkout with its
 * Idempotency-Key, and leaves every other call to mock-api.ts.
 */
async function answerPayments(page: Page, baseURL: string, state: Pick<Payment, 'status'>) {
	const sent: { body: CheckoutInput; key?: string }[] = [];
	await page.route(
		(url) => url.pathname === '/v1/me' || url.pathname.startsWith('/v1/payments'),
		(route) => {
			const request = route.request();
			const headers = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
			};
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
			const path = `${request.method()} ${new URL(request.url()).pathname}`;
			if (path === 'GET /v1/me') return route.fulfill({ json: { ...me, id: OWNER.id }, headers });
			if (path === `GET /v1/payments/${ID}`) return route.fulfill({ json: { ...payment, ...state }, headers });
			if (path === 'POST /v1/payments/checkout') {
				const body = request.postDataJSON() as CheckoutInput;
				sent.push({ body, key: request.headers()['idempotency-key'] });
				const back = encodeURIComponent(body.return_to);
				return route.fulfill({
					json: {
						payment_id: ID,
						checkout_url: `${baseURL}/dev/checkout?payment_id=${ID}&return_to=${back}`,
					},
					headers,
				});
			}
			return route.fallback();
		}
	);
	return sent;
}

/** The owner marks Medo home (P9 → P14) and lands on the reunited page. */
async function reunite(page: Page) {
	await page.goto('/r/Tip12345');
	await (await hydrated(page.getByRole('button', { name: 'Žival je spet doma', exact: true }))).click();
	await page
		.getByRole('dialog', { name: 'Je Medo res spet doma?' })
		.getByRole('button', { name: 'Da, spet je doma', exact: true })
		.click();
	await expect(page).toHaveURL(/\/r\/Tip12345\/spet-doma$/);
	return page.getByRole('region', { name: t.tip_title, exact: true });
}

test.beforeEach(async ({ page, baseURL }) => {
	await fetch(`${api()}/e2e/reset/Tip12345`, { method: 'POST' });
	await signInAs(page, OWNER, baseURL!);
	await dismissConsent(page);
});

test('the reunited tip: nothing chosen, 5 € through the mock checkout, then thanks in its place', async ({
	page,
	baseURL,
}) => {
	test.setTimeout(90_000);
	const state: Pick<Payment, 'status'> = { status: 'pending' };
	const sent = await answerPayments(page, baseURL!, state);
	const tip = await reunite(page);

	await expect(tip.getByRole('heading', { level: 2, name: t.tip_title, exact: true })).toBeVisible();
	await expect(tip.getByRole('radio', { checked: true })).toHaveCount(0);
	await expect(tip.getByRole('button', { name: t.pay_disabled, exact: true })).toBeDisabled();
	await expect(tip.getByRole('button', { name: t.skip, exact: true })).toBeEnabled();
	await expect(tip.getByText(t.test_note, { exact: true })).toBeVisible();
	await expectNoAxeViolations(page);

	await tip.getByRole('radio', { name: `${t.amount_5}, ${t.amount_suggested_a11y}`, exact: true }).click();
	await tip.getByRole('button', { name: /^Plačaj 5,00\s€$/ }).click();
	await expect(page).toHaveURL(new RegExp(`/dev/checkout\\?payment_id=${ID}&`));
	expect(sent).toHaveLength(1);
	expect(sent[0]!.body).toMatchObject({
		purpose: 'tip',
		amount_cents: 500,
		locale: 'sl',
		return_to: '/r/Tip12345/spet-doma',
	});
	expect(sent[0]!.body.refs?.report_id).toBeTruthy();
	expect(sent[0]!.key).toMatch(/^[0-9a-f-]{36}$/);

	state.status = 'succeeded';
	await page.getByRole('button', { name: 'Success', exact: true }).click();
	await expect(page).toHaveURL(/\/placila\/zakljucek\?payment_id=/, { timeout: 30_000 });
	await expect(page.getByRole('heading', { level: 1, name: sl.payments.success_title, exact: true })).toBeFocused({
		timeout: 15_000,
	});
	await page.getByRole('link', { name: sl.payments.success_back, exact: true }).click();

	await expect(page).toHaveURL(/\/r\/Tip12345\/spet-doma$/);
	await expect(page.getByText(t.already_paid, { exact: true })).toBeVisible();
	await expect(page.getByRole('region', { name: t.tip_title, exact: true })).toHaveCount(0);
});

test('Preskoči ends the ask for that report, also after a reload, at 390 px', async ({ page, baseURL }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const sent = await answerPayments(page, baseURL!, { status: 'pending' });
	const tip = await reunite(page);

	await tip.getByRole('button', { name: t.skip, exact: true }).click();
	await expect(tip).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Končano', exact: true })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

	await page.reload();
	await expect(page.getByRole('heading', { level: 1, name: 'Medo je spet doma', exact: true })).toBeVisible();
	await expect(page.getByRole('region', { name: t.tip_title, exact: true })).toHaveCount(0);
	expect(sent).toEqual([]);
});

test('the Profile card: the same amounts, no Skip, purpose support', async ({ page, baseURL }) => {
	const sent = await answerPayments(page, baseURL!, { status: 'pending' });
	await page.goto('/racun');
	const card = page
		.locator('[data-slot=card]')
		.filter({ has: page.getByRole('heading', { level: 2, name: t.card_title, exact: true }) });

	await expect(card.getByRole('radio')).toHaveText([
		t.amount_3,
		`${t.amount_5}, ${t.amount_suggested_a11y}`,
		t.amount_10,
		t.amount_other,
	]);
	await expect(card.getByRole('button', { name: t.skip, exact: true })).toHaveCount(0);
	await expectNoAxeViolations(page);

	await card.getByRole('radio', { name: t.amount_10, exact: true }).click();
	await card.getByRole('button', { name: /^Plačaj 10,00\s€$/ }).click();
	await expect(page).toHaveURL(new RegExp(`/dev/checkout\\?payment_id=${ID}&`));
	expect(sent.map(({ body }) => body)).toEqual([
		{ purpose: 'support', amount_cents: 1000, locale: 'sl', return_to: '/racun/placila' },
	]);
});
