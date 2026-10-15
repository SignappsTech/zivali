import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkout, checkoutInput, minAmount, payment } from '../src/__fixtures__/payments.ts';
import { openCheckout, PAYMENTS_RETURN_URL, paymentsApi, redirectToCheckout, startCheckout } from '../src/payments.ts';
import { mockStore } from './helpers.ts';

const e = paymentsApi.endpoints;

test('payment endpoints map their arguments to the C13 routes', async (t) => {
	const { store, client, calls } = mockStore(t, {
		'POST /v1/payments/checkout': checkout,
		'GET /v1/payments/:id': payment,
		'GET /v1/me/payments': { items: [payment], next_cursor: null },
	});

	const created = await store.dispatch(e.checkout.initiate({ body: checkoutInput, idempotencyKey: 'k-1' }));
	assert.deepEqual(created.data, checkout);
	const one = await store.dispatch(e.getPayment.initiate({ id: payment.id }, { subscribe: false }));
	assert.deepEqual(one.data, payment);
	await store.dispatch(e.listMyPayments.initiate({ cursor: 'p2' }, { subscribe: false }));

	assert.equal(client.calls[0]!.headers['Idempotency-Key'], 'k-1');
	assert.deepEqual(calls(), [
		{ method: 'POST', path: '/v1/payments/checkout', query: {}, body: checkoutInput },
		{ method: 'GET', path: `/v1/payments/${payment.id}`, query: {}, body: undefined },
		{ method: 'GET', path: '/v1/me/payments', query: { cursor: 'p2' }, body: undefined },
	]);
});

test('startCheckout sends the wire body and returns { paymentId, checkoutUrl }', async (t) => {
	const { store, client } = mockStore(t, { 'POST /v1/payments/checkout': checkout });
	const input = {
		purpose: 'tip',
		amountCents: 500,
		refs: { report_id: checkoutInput.refs!.report_id },
		returnTo: '/r/Hk3vT9qP/reunited',
		locale: 'sl',
	} as const;

	const result = await startCheckout(store.dispatch, { ...input, idempotencyKey: 'submit-1' });
	assert.deepEqual(result, { paymentId: checkout.payment_id, checkoutUrl: checkout.checkout_url });
	await startCheckout(store.dispatch, { ...input, returnScheme: true });

	const [first, second] = client.calls;
	assert.deepEqual(first!.body, checkoutInput);
	assert.equal(first!.headers['Idempotency-Key'], 'submit-1');
	assert.deepEqual(second!.body, { ...checkoutInput, return_scheme: true });
	assert.match(second!.headers['Idempotency-Key']!, /^[0-9a-f-]{36}$/);
});

test('startCheckout rejects with the QueryError (MIN_AMOUNT, 422)', async (t) => {
	const { store } = mockStore(t, {
		'POST /v1/payments/checkout': () =>
			new Response(JSON.stringify(minAmount), { status: 422, headers: { 'Content-Type': 'application/json' } }),
	});
	await assert.rejects(
		startCheckout(store.dispatch, { purpose: 'tip', amountCents: 100, returnTo: '/', locale: 'sl' }),
		{ status: 422, data: { ...minAmount.error, issues: undefined, requestId: undefined } }
	);
});

test('redirectToCheckout assigns the location (web); openCheckout opens an auth session back to the app (mobile)', async () => {
	const assigned: string[] = [];
	Object.assign(globalThis, { window: { location: { assign: (url: string) => assigned.push(url) } } });
	redirectToCheckout(checkout.checkout_url);
	assert.deepEqual(assigned, [checkout.checkout_url]);

	const opened = await openCheckout(
		async (url, redirectUrl) => ({ type: 'success', url, redirectUrl }),
		checkout.checkout_url
	);
	assert.deepEqual(opened, { type: 'success', url: checkout.checkout_url, redirectUrl: PAYMENTS_RETURN_URL });
	assert.equal(PAYMENTS_RETURN_URL, 'zivali://payments/return');
});
