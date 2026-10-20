import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { me } from '@zivali/api/__fixtures__/me';
import { minAmount, payment } from '@zivali/api/__fixtures__/payments';
import en from '@zivali/i18n/dist/en.json' with { type: 'json' };
import sl from '@zivali/i18n/dist/sl.json' with { type: 'json' };
import type { Payment } from '@zivali/types';

import { signInAs } from './session';

// TASK-32.2: the C13 mock provider end to end on web. The browser's API calls are answered here; /dev/checkout posts
// the signed webhook event from the server to e2e/mock-api.ts, which accepts only a correctly signed one.
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const ID = payment.id;
const RETURN_TO = '/r/Hk3vT9qP/spet-doma';

/** Protected flow (C15): no ad slot renders (as tests/quality/guards.mjs expectNoAdSlots, which has no types). */
const expectNoAdSlots = (page: Page) => expect(page.locator('[data-ad-slot]')).toHaveCount(0);

async function expectNoAxeViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
	expect(
		violations.map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
	).toEqual([]);
}

/** Signs in and answers the API: the payment (status read from `state` on every call), checkout, My payments. */
async function answer(page: Page, baseURL: string, state: Pick<Payment, 'status'>, list: Payment[] = []) {
	await signInAs(page, { id: me.id, role: me.role, aal: 'aal1' }, baseURL);
	await page.route(
		(url) => url.pathname.startsWith('/v1/'),
		(route) => {
			const request = route.request();
			const headers = {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
				'Access-Control-Allow-Headers': request.headers()['access-control-request-headers'] ?? '*',
			};
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
			const path = `${request.method()} ${new URL(request.url()).pathname}`;
			if (path === 'GET /v1/me') return route.fulfill({ json: me, headers });
			if (path === `GET /v1/payments/${ID}`) return route.fulfill({ json: { ...payment, ...state }, headers });
			if (path === 'GET /v1/me/payments')
				return route.fulfill({ json: { items: list, next_cursor: null }, headers });
			const own = list.find((item) => path === `GET /v1/me/payments/${item.id}`);
			if (own) return route.fulfill({ json: own, headers });
			if (path === 'POST /v1/payments/checkout') {
				if (request.postDataJSON().amount_cents < 200)
					return route.fulfill({ status: 422, json: minAmount, headers });
				return route.fulfill({
					json: { payment_id: ID, checkout_url: `${baseURL}/dev/checkout?payment_id=${ID}` },
					headers,
				});
			}
			return route.fulfill({ status: 404, json: { error: { code: 'NOT_FOUND', message: path } }, headers });
		}
	);
}

test('below 2 € the minimum shows; then the mock checkout succeeds and the return page confirms', async ({
	page,
	baseURL,
}) => {
	test.setTimeout(90_000);
	const state: Pick<Payment, 'status'> = { status: 'pending' };
	await answer(page, baseURL!, state);

	await page.goto('/dev/checkout');
	const amount = page.getByLabel('Amount in euros');
	await amount.fill('1,50');
	await page.getByRole('button', { name: 'Go to checkout' }).click();
	await expect(page.getByText(sl.errors.MIN_AMOUNT)).toBeVisible();
	await expect(amount).toHaveAttribute('aria-invalid', 'true');

	await amount.fill('5');
	await page.getByRole('button', { name: 'Go to checkout' }).click();
	await expect(page).toHaveURL(`/dev/checkout?payment_id=${ID}`);
	await expect(page.getByText(/5,00\s€ · tip · pending/)).toBeVisible({ timeout: 15_000 });
	await expectNoAdSlots(page);

	// The webhook is still on its way: the return page waits, then picks up the settled payment by itself.
	await page.getByRole('button', { name: 'Success' }).click();
	await expect(page).toHaveURL(`/placila/zakljucek?payment_id=${ID}`, { timeout: 30_000 });
	await expect(page.getByRole('heading', { level: 1, name: sl.payments.pending_title })).toBeFocused();
	await expect(page.getByRole('main').getByRole('status')).toContainText(sl.payments.pending_body);
	state.status = 'succeeded';
	await expect(page.getByRole('heading', { level: 1, name: sl.payments.success_title })).toBeFocused({
		timeout: 15_000,
	});
	await expect(page.getByText(sl.payments.success_body)).toBeVisible();
	// No return_to from the mock checkout URL: back goes home.
	await expect(page.getByRole('link', { name: sl.payments.success_back })).toHaveAttribute('href', '/');
	await expect(page).toHaveTitle(`${sl.payments.success_title} · Najdimo`);
	await expectNoAdSlots(page);
	await expectNoAxeViolations(page);
});

test("the mock checkout's Fail lands on the failed state, back to where the payment started", async ({
	page,
	baseURL,
}) => {
	const state: Pick<Payment, 'status'> = { status: 'pending' };
	await answer(page, baseURL!, state);
	await page.goto(`/dev/checkout?payment_id=${ID}&return_to=${RETURN_TO}`);
	state.status = 'failed';
	await page.getByRole('button', { name: 'Fail' }).click();

	await expect(page).toHaveURL(/\/placila\/zakljucek\?payment_id=[^&]+&return_to=[^&]+$/, { timeout: 30_000 });
	await expect(page.getByRole('heading', { level: 1, name: sl.payments.failed_title })).toBeFocused();
	await expect(page.getByText(sl.payments.failed_body)).toBeVisible();
	await expect(page.getByRole('button', { name: sl.payments.failed_retry })).toBeEnabled();
	await expect(page.getByRole('link', { name: sl.payments.failed_skip, exact: true })).toHaveAttribute(
		'href',
		RETURN_TO
	);
	await expectNoAdSlots(page);
	await expectNoAxeViolations(page);
});

test("the mock checkout's Cancel lands on the cancelled state in English", async ({ page, baseURL }) => {
	await answer(page, baseURL!, { status: 'pending' });
	await page.goto(`/en/dev/checkout?payment_id=${ID}&return_to=/en/r/Hk3vT9qP/reunited`);
	await page.getByRole('button', { name: 'Cancel' }).click();

	await expect(page).toHaveURL(/\/en\/payments\/return\?payment_id=[^&]+&return_to=[^&]+&canceled=1$/, {
		timeout: 30_000,
	});
	await expect(page.getByRole('heading', { level: 1, name: en.payments.cancel_title })).toBeFocused();
	await expect(page.getByText(en.payments.cancel_body)).toBeVisible();
	await expect(page.getByRole('link', { name: en.payments.cancel_back })).toHaveAttribute(
		'href',
		'/en/r/Hk3vT9qP/reunited'
	);
	await expect(page.getByRole('button', { name: en.payments.cancel_retry })).toBeEnabled();
	await expectNoAdSlots(page);
});

test('My payments: one card row per settled payment under one test note; a row opens its detail', async ({
	page,
	baseURL,
}) => {
	const row = (n: number, day: number, fields: Partial<Payment>): Payment => ({
		...payment,
		id: `${ID.slice(0, -1)}${n}`,
		created_at: `2026-10-${String(day).padStart(2, '0')}T10:00:00Z`,
		...fields,
	});
	await answer(page, baseURL!, { status: 'succeeded' }, [
		row(1, 15, { amount_cents: 500 }),
		row(2, 2, { purpose: 'report_contribution', status: 'failed', amount_cents: 300 }),
		row(3, 1, { status: 'pending', amount_cents: 700 }),
		row(4, 1, { status: 'refunded', amount_cents: 1000 }),
	]);

	await page.goto('/racun/placila');
	await expect(page.getByRole('heading', { level: 1, name: sl.payments.list_title })).toBeVisible();
	// No test flag from the API yet (CH-702), so the local environment decides: one note, no label per row.
	await expect(page.getByText(sl.payments.test_note_list)).toBeVisible();
	const rows = page.getByRole('main').getByRole('link');
	await expect(rows).toHaveText([
		/^Prispevek v zahvalo\s*15\. 10\. 2026\s*5,00\s€\s*Plačano$/,
		/^Prispevek ob prijavi\s*2\. 10\. 2026\s*3,00\s€\s*Neuspešno$/,
		/^Prispevek v zahvalo\s*1\. 10\. 2026\s*10,00\s€\s*Vrnjeno$/,
	]);
	await expectNoAxeViolations(page);

	await rows.first().click();
	await expect(page).toHaveURL(new RegExp(`/racun/placila/${ID.slice(0, -1)}1$`));
	await expect(page.getByRole('heading', { level: 1, name: sl.payments.purpose_tip })).toBeVisible();
	await expect(page.getByText(sl.payments.detail_test_note)).toBeVisible();
	await expectNoAdSlots(page);
	await expectNoAxeViolations(page);
	await page.getByRole('link', { name: sl.payments.detail_back }).click();
	await expect(page).toHaveURL(/\/racun\/placila$/);

	await page.goto('/en/account/payments');
	await expect(rows.first()).toHaveText(/^Thank-you contribution\s*15\/10\/2026\s*€5\.00\s*Paid$/);
});
