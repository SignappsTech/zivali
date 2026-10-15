import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
	CONSENT_VERSION,
	getConsent,
	getMockEvents,
	initAnalytics,
	needsConsentPrompt,
	resetMockEvents,
	setConsent,
	subscribeConsent,
	track,
	type ConsentState,
} from '../src/index.ts';

const DAY = 24 * 60 * 60 * 1000;
let saved: string | null;

const start = (stored: Partial<ConsentState> | string | null = null) => {
	saved = typeof stored === 'string' || stored === null ? stored : JSON.stringify(stored);
	initAnalytics({ storage: { get: () => saved, set: (v) => void (saved = v) } });
};
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const share = () => track('share', { method: 'copy_link', report_type: 'found', species: 'cat' });

beforeEach(() => resetMockEvents());

test('not asked yet: null and a prompt', () => {
	start();
	assert.equal(getConsent(), null);
	assert.equal(needsConsentPrompt(), true);
});

test('setConsent persists { v, analytics, ts } and stops prompting', () => {
	start();
	setConsent({ analytics: true });
	const state = JSON.parse(saved!) as ConsentState;
	assert.equal(state.v, CONSENT_VERSION);
	assert.equal(state.analytics, true);
	assert.ok(Math.abs(Date.parse(state.ts) - Date.now()) < 5000);
	assert.deepEqual(getConsent(), state);
	assert.equal(needsConsentPrompt(), false);
});

test('a stored grant is honoured on the next start', () => {
	start({ v: CONSENT_VERSION, analytics: true, ts: ago(30) });
	share();
	assert.equal(getMockEvents().length, 1);
});

test('a changed version or a record older than 12 months prompts again and blocks tracking', () => {
	for (const stale of [
		{ v: CONSENT_VERSION - 1, analytics: true, ts: ago(1) },
		{ v: CONSENT_VERSION, analytics: true, ts: ago(366) },
		{ v: CONSENT_VERSION, analytics: true, ts: 'yesterday' },
	]) {
		start(stale);
		assert.equal(needsConsentPrompt(), true);
		share();
	}
	assert.deepEqual(getMockEvents(), []);
});

test('malformed records count as not asked yet', () => {
	for (const raw of ['{', '"yes"', '{"v":1,"analytics":"true","ts":"x"}', '%E0%A4%A']) {
		start(raw);
		assert.equal(getConsent(), null);
	}
});

test('subscribeConsent reports every change until unsubscribed', () => {
	start();
	const seen: (boolean | undefined)[] = [];
	const unsubscribe = subscribeConsent((s) => seen.push(s?.analytics));
	setConsent({ analytics: true });
	setConsent({ analytics: false });
	unsubscribe();
	setConsent({ analytics: true });
	assert.deepEqual(seen, [true, false]);
});
