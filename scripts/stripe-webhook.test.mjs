import { test } from 'node:test';
import assert from 'node:assert/strict';

import { STRIPE_API_VERSION } from '../apps/api/adapters/payments/stripe-version.ts';
import { ACCOUNT_ID, ensureWebhook, EVENTS, resolveKey, setEnvLine } from './stripe-webhook.mjs';

const URL_ = 'https://api-staging.najdimo.si/v1/webhooks/stripe';

/** A fake Stripe API: records calls, answers from `endpoints`. No test reaches Stripe. */
function fakeStripe(endpoints = [], accountId = ACCOUNT_ID) {
	const calls = [];
	const stripe = async (method, path, form) => {
		calls.push({ method, path, form: form && Object.fromEntries(form) });
		if (method === 'GET' && path === '/v1/account') return { id: accountId };
		if (method === 'GET') return { data: endpoints };
		if (method === 'POST' && path === '/v1/webhook_endpoints')
			return { id: 'we_new', secret: 'whsec_created', livemode: false };
		return {};
	};
	return { stripe, calls };
}

test('refuses live and missing keys before any call', async () => {
	for (const key of ['sk_live_x', 'rk_live_x', 'pk_test_x', undefined]) {
		const { stripe, calls } = fakeStripe();
		await assert.rejects(ensureWebhook({ key, url: URL_, hasSecret: false, stripe }), /test key/);
		assert.equal(calls.length, 0);
	}
});

test('creates the endpoint with every handled event and returns its secret', async () => {
	const { stripe, calls } = fakeStripe();
	const result = await ensureWebhook({ key: 'sk_test_x', url: URL_, hasSecret: false, stripe });
	assert.deepEqual(result, { action: 'created', secret: 'whsec_created' });
	const create = calls.find((c) => c.method === 'POST');
	assert.equal(create.form.url, URL_);
	assert.deepEqual(
		Object.entries(create.form)
			.filter(([k]) => k.startsWith('enabled_events'))
			.map(([, v]) => v),
		EVENTS
	);
});

test('keeps an up-to-date endpoint, updates its events, recreates it when the secret is not stored', async () => {
	const current = { id: 'we_1', url: URL_, enabled_events: [...EVENTS] };
	assert.deepEqual(
		await ensureWebhook({ key: 'sk_test_x', url: URL_, hasSecret: true, stripe: fakeStripe([current]).stripe }),
		{ action: 'kept' }
	);
	const stale = fakeStripe([{ ...current, enabled_events: ['checkout.session.completed'] }]);
	assert.deepEqual(await ensureWebhook({ key: 'sk_test_x', url: URL_, hasSecret: true, stripe: stale.stripe }), {
		action: 'updated',
	});
	assert.equal(stale.calls.at(-1).path, '/v1/webhook_endpoints/we_1');
});

test('an endpoint without a stored secret is only recreated with --recreate', async () => {
	const current = { id: 'we_1', url: URL_, enabled_events: [...EVENTS] };
	const stopped = fakeStripe([current]);
	await assert.rejects(
		ensureWebhook({ key: 'sk_test_x', url: URL_, hasSecret: false, stripe: stopped.stripe }),
		/NEEDS-INPUT/
	);
	assert.ok(stopped.calls.every((c) => c.method === 'GET'));
	const lost = fakeStripe([current]);
	const result = await ensureWebhook({
		key: 'sk_test_x',
		url: URL_,
		hasSecret: false,
		recreate: true,
		stripe: lost.stripe,
	});
	assert.equal(result.action, 'created');
	assert.deepEqual(
		lost.calls.map((c) => `${c.method} ${c.path}`),
		[
			'GET /v1/account',
			'GET /v1/webhook_endpoints?limit=100',
			'DELETE /v1/webhook_endpoints/we_1',
			'POST /v1/webhook_endpoints',
		]
	);
	assert.equal(lost.calls.at(-1).form.api_version, STRIPE_API_VERSION);
});

test('refuses any other Stripe account before a write', async () => {
	const other = fakeStripe([], 'acct_other');
	await assert.rejects(
		ensureWebhook({ key: 'sk_test_x', url: URL_, hasSecret: false, recreate: true, stripe: other.stripe }),
		/not the Najdimo sandbox/
	);
	assert.deepEqual(
		other.calls.map((c) => c.method),
		['GET']
	);
});

test('a key exported in the environment must equal the env file key', () => {
	assert.equal(resolveKey('sk_test_a', undefined), 'sk_test_a');
	assert.equal(resolveKey('sk_test_a', 'sk_test_a'), 'sk_test_a');
	assert.throws(() => resolveKey('sk_test_a', 'sk_test_b'), /differs/);
	assert.throws(() => resolveKey(undefined, 'sk_test_b'), /differs/);
});

test('setEnvLine replaces the line or appends it', () => {
	assert.equal(
		setEnvLine('A=1\nSTRIPE_WEBHOOK_SECRET=old\nB=2\n', 'STRIPE_WEBHOOK_SECRET', 'new'),
		'A=1\nSTRIPE_WEBHOOK_SECRET=new\nB=2\n'
	);
	assert.equal(setEnvLine('A=1', 'STRIPE_WEBHOOK_SECRET', 'new'), 'A=1\nSTRIPE_WEBHOOK_SECRET=new\n');
	assert.equal(setEnvLine('', 'STRIPE_WEBHOOK_SECRET', 'new'), 'STRIPE_WEBHOOK_SECRET=new\n');
});
