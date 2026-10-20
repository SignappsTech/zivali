import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';

import {
	commerceParams,
	flowTracker,
	getMockEvents,
	initAnalytics,
	resetMockEvents,
	setConsent,
	track,
	type ConsentStorage,
} from '../src/index.ts';

const memory = (): ConsentStorage => {
	let raw: string | null = null;
	return { get: () => raw, set: (v) => void (raw = v) };
};

// Fake monotonic clock: performance.now() in milliseconds.
let clock = 0;
const wait = (seconds: number) => void (clock += seconds * 1000);

beforeEach(() => {
	initAnalytics({ storage: memory() });
	resetMockEvents();
	clock = 0;
	mock.restoreAll();
	mock.method(performance, 'now', () => clock);
});

test('step() sends flow_step with the bucketed dwell of the previous step, none on the first', () => {
	setConsent({ analytics: true });
	const flow = flowTracker('report_lost');
	flow.step('pet');
	wait(9.9);
	flow.step('photos');
	wait(10);
	flow.step('details');
	wait(59.5);
	flow.step('where');
	wait(60);
	flow.step('when');
	wait(180);
	flow.step('review', { species: 'dog' });
	assert.deepEqual(getMockEvents(), [
		{ name: 'flow_step', params: { flow: 'report_lost', step: 'pet' } },
		{ name: 'flow_step', params: { flow: 'report_lost', step: 'photos', dwell: '0-9' } },
		{ name: 'flow_step', params: { flow: 'report_lost', step: 'details', dwell: '10-29' } },
		{ name: 'flow_step', params: { flow: 'report_lost', step: 'where', dwell: '30-59' } },
		{ name: 'flow_step', params: { flow: 'report_lost', step: 'when', dwell: '60-179' } },
		{ name: 'flow_step', params: { flow: 'report_lost', step: 'review', dwell: '180+', species: 'dog' } },
	]);
});

test('the same step twice in a row is not resent; going back is a new step; a new tracker restarts dwell', () => {
	setConsent({ analytics: true });
	const flow = flowTracker('report_found');
	flow.step('photo');
	flow.step('photo'); // a re-render or a restored draft
	wait(12);
	flow.step('what');
	wait(40);
	flow.step('what');
	wait(5);
	flow.step('photo'); // back: dwell counts from when `what` first showed
	flowTracker('report_found').step('photo');
	assert.deepEqual(getMockEvents(), [
		{ name: 'flow_step', params: { flow: 'report_found', step: 'photo' } },
		{ name: 'flow_step', params: { flow: 'report_found', step: 'what', dwell: '10-29' } },
		{ name: 'flow_step', params: { flow: 'report_found', step: 'photo', dwell: '30-59' } },
		{ name: 'flow_step', params: { flow: 'report_found', step: 'photo' } },
	]);
});

test('error() sends one flow_error per call: the field key and code, never a value', () => {
	setConsent({ analytics: true });
	const flow = flowTracker('sign_up');
	flow.step('form');
	flow.error('form', 'required', 'email');
	flow.error('form', 'CONFLICT');
	assert.deepEqual(getMockEvents().slice(1), [
		{ name: 'flow_error', params: { flow: 'sign_up', step: 'form', error_code: 'required', error_field: 'email' } },
		{ name: 'flow_error', params: { flow: 'sign_up', step: 'form', error_code: 'CONFLICT' } },
	]);
	assert.throws(() => flow.error('form', 'invalid', 'janez@example.si'), /invalid value for "error_field"/);
	// @ts-expect-error `amount` is a checkout step
	assert.throws(() => flow.step('amount'), /"step" is not a step of "flow"/);
	// @ts-expect-error not a registered code
	assert.throws(() => flow.error('form', 'Email taken'), /invalid value for "error_code"/);
});

test('step() and error() are no-ops without consent, before and after a decline', () => {
	const flow = flowTracker('checkout');
	flow.step('amount');
	flow.error('amount', 'MIN_AMOUNT', 'amount');
	setConsent({ analytics: false });
	wait(3);
	flow.step('return');
	flow.error('return', 'canceled');
	assert.deepEqual(getMockEvents(), []);

	setConsent({ analytics: true });
	wait(31);
	flow.step('amount');
	assert.deepEqual(getMockEvents(), [
		{ name: 'flow_step', params: { flow: 'checkout', step: 'amount', dwell: '30-59' } },
	]);
});

test('commerceParams: cents to EUR with 2 decimals, plan only when given; begin_checkout and purchase accept it', () => {
	assert.deepEqual(commerceParams({ purpose: 'tip', amount_cents: 500, currency: 'EUR' }), {
		value: 5,
		currency: 'EUR',
		purpose: 'tip',
	});
	assert.deepEqual(commerceParams({ purpose: 'subscription', amount_cents: 4999, currency: 'EUR', plan: 'yearly' }), {
		value: 49.99,
		currency: 'EUR',
		purpose: 'subscription',
		plan: 'yearly',
	});
	assert.equal(commerceParams({ purpose: 'boost', amount_cents: 1, currency: 'EUR' }).value, 0.01);

	setConsent({ analytics: true });
	const premium = commerceParams({ purpose: 'subscription', amount_cents: 399, currency: 'EUR', plan: 'monthly' });
	track('begin_checkout', premium);
	track('purchase', premium);
	assert.deepEqual(
		getMockEvents().map((e) => e.name),
		['begin_checkout', 'purchase']
	);
	assert.deepEqual(getMockEvents()[1]!.params, {
		value: 3.99,
		currency: 'EUR',
		purpose: 'subscription',
		plan: 'monthly',
	});
});
