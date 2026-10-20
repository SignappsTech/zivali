import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import {
	getMockEvents,
	initAnalytics,
	resetMockEvents,
	setConsent,
	setUserRole,
	track,
	trackScreen,
	type ConsentStorage,
} from '../src/index.ts';
import { EVENTS } from '../src/registry.ts';

const memory = (raw: string | null = null): ConsentStorage => ({ get: () => raw, set: (v) => void (raw = v) });
const lost = { report_type: 'lost', species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' } as const;
const home = { species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' } as const;
const rejected = /@zivali\/analytics/;

beforeEach(() => {
	initAnalytics({ storage: memory() });
	resetMockEvents();
});

test('registry holds the 26 C12 v2.0 events with GA4 parameter names only', () => {
	assert.deepEqual(Object.keys(EVENTS).sort(), [
		'ad_slot_click',
		'ad_slot_impression',
		'ai_prefill',
		'alert_opt_in',
		'begin_checkout',
		'boost_purchase',
		'chat_started',
		'donation',
		'flow_error',
		'flow_step',
		'generate_lead',
		'login',
		'match_confirmed',
		'match_rejected',
		'match_suggested',
		'poster_download',
		'premium_subscribe',
		'purchase',
		'report_found_start',
		'report_found_submit',
		'report_lost_start',
		'report_lost_submit',
		'reunited',
		'share',
		'sign_up',
		'supporter_subscribe',
	]);
	const names = new Set(Object.values(EVENTS).flatMap((schema) => Object.keys(schema)));
	assert.deepEqual([...names].sort(), [
		'ad_id',
		'ad_slot',
		'amount_bucket',
		'currency',
		'dwell',
		'error_code',
		'error_field',
		'flow',
		'lead_type',
		'match_source',
		'method',
		'municipality',
		'outcome',
		'plan',
		'purpose',
		'region',
		'report_type',
		'species',
		'step',
		'value',
	]);
});

test('track() is a no-op without consent, and after a decline or withdrawal', () => {
	track('report_lost_submit', lost);
	trackScreen('/r/[code]');
	setUserRole('owner');
	assert.deepEqual(getMockEvents(), []);

	setConsent({ analytics: false });
	track('report_lost_submit', lost);
	assert.deepEqual(getMockEvents(), []);

	setConsent({ analytics: true });
	track('report_lost_submit', lost);
	setConsent({ analytics: false });
	track('report_lost_submit', lost);
	const sent = getMockEvents().filter((e) => e.name === 'report_lost_submit');
	assert.equal(sent.length, 1);
});

test('granting consent sends the current screen and role, then events with their params', () => {
	trackScreen('/en/report/lost');
	setUserRole('finder');
	setConsent({ analytics: true });
	track('donation', { value: 5, currency: 'EUR', amount_bucket: '5-9', purpose: 'tip' });
	track('report_found_start');
	assert.deepEqual(getMockEvents(), [
		{ name: 'user_property', params: { user_role: 'finder' } },
		{ name: 'screen_view', params: { path: '/en/report/lost' } },
		{ name: 'donation', params: { value: 5, currency: 'EUR', amount_bucket: '5-9', purpose: 'tip' } },
		{ name: 'report_found_start', params: {} },
	]);
});

test('unknown events and parameters throw outside production, even without consent', () => {
	// @ts-expect-error not in the registry
	assert.throws(() => track('page_scroll', {}), /unknown event/);
	// @ts-expect-error not allowlisted
	assert.throws(() => track('reunited', { ...home, pet_name: 'Max' }), /"pet_name" is not allowed/);
	// @ts-expect-error required param missing
	assert.throws(() => track('reunited', { species: 'dog' }), /missing "region"/);
});

test('names, emails, chip-like numbers, coordinates and free text are rejected', () => {
	setConsent({ analytics: true });
	const cases: [string, Record<string, unknown>][] = [
		['name as param', { name: 'Janez Novak' }],
		['name as value', { municipality: 'Janez Novak' }],
		['email as param', { email: 'janez@example.si' }],
		['email as value', { region: 'janez@example.si' }],
		['phone', { phone: '+38641123456' }],
		['chip number as slug', { municipality: '985112345678901' }],
		['chip number as value', { value: 985112345678901 }],
		['chip number as ad id', { ad_id: '985112345678901' }],
		['coordinates as value', { region: '46.0569,14.5058' }],
		['municipality as region', { region: 'ljubljana' }],
		['name slug as region', { region: 'janez-novak' }],
		['coordinates as params', { lat: 46.0569, lng: 14.5058 }],
		['coordinate as money', { value: 46.056912 }],
		['free text as enum', { species: 'black dog with white paws' }],
		['free text as slug', { municipality: 'pobegnil je pri trgovini' }],
		['short code', { code: 'AB12CD' }],
		['user id', { user_id: '7f9c2b1e-0000-4000-8000-000000000000' }],
	];
	for (const [label, bad] of cases) {
		const base = { value: 10, currency: 'EUR', species: 'dog', region: 'gorenjska' };
		assert.throws(() => track('boost_purchase', { ...base, ...bad } as never), rejected, label);
	}
	assert.throws(() => trackScreen('/r/AB12CD'), rejected);
	assert.throws(() => trackScreen('/search?q=janez@example.si'), rejected);
	assert.throws(() => setUserRole('janez' as never), rejected);
	assert.deepEqual(getMockEvents(), []);
});

test('type-level: values outside the enums do not compile', () => {
	setConsent({ analytics: true });
	// @ts-expect-error report_found_submit only takes found | sighted
	assert.throws(() => track('report_found_submit', lost), /invalid value for "report_type"/);
	// @ts-expect-error region is one of the 12 statistical regions, not a municipality
	const municipalityAsRegion = () => track('poster_download', { species: 'dog', region: 'ljubljana' });
	assert.throws(municipalityAsRegion, /invalid value for "region"/);
	// @ts-expect-error currency is EUR only
	assert.throws(() => track('supporter_subscribe', { value: 3, currency: 'USD' }), /invalid value for "currency"/);
	track('ad_slot_click', { ad_slot: 'feed', ad_id: '0b9e6a4c-3f1d-4c2e-9a7b-5d8e1f2a3b4c' });
	assert.equal(getMockEvents().length, 1);
});

test('v2: the GA4-reserved v1 ad names are gone, so a slot event cannot be sent under them', () => {
	setConsent({ analytics: true });
	const ad = { ad_slot: 'feed', ad_id: '0b9e6a4c-3f1d-4c2e-9a7b-5d8e1f2a3b4c' } as const;
	// @ts-expect-error renamed ad_slot_impression (GA4 reserves ad_impression on web streams)
	assert.throws(() => track('ad_impression', ad), /unknown event "ad_impression"/);
	// @ts-expect-error renamed ad_slot_click (GA4 reserves ad_click on app streams)
	assert.throws(() => track('ad_click', ad), /unknown event "ad_click"/);
	track('ad_slot_impression', ad);
	assert.deepEqual(getMockEvents(), [{ name: 'ad_slot_impression', params: ad }]);
});

test('v2: a step of another flow is rejected, at compile time and at runtime', () => {
	setConsent({ analytics: true });
	// @ts-expect-error `send` is a report_found step, not a report_lost one
	assert.throws(() => track('flow_step', { flow: 'report_lost', step: 'send' }), /"step" is not a step of "flow"/);
	// @ts-expect-error `amount` belongs to checkout
	const wrong = () => track('flow_error', { flow: 'sign_in', step: 'amount', error_code: 'NETWORK' });
	assert.throws(wrong, /"step" is not a step of "flow"/);
	// @ts-expect-error not a step of any flow
	assert.throws(() => track('flow_step', { flow: 'report_lost', step: 'payment' }), /invalid value for "step"/);
	// @ts-expect-error not a flow
	assert.throws(() => track('flow_step', { flow: 'wizard', step: 'pet' }), /invalid value for "flow"/);
	track('flow_step', { flow: 'report_lost', step: 'review', dwell: '30-59', species: 'dog' });
	track('flow_error', { flow: 'report_lost', step: 'details', error_code: 'required', error_field: 'colours' });
	assert.deepEqual(getMockEvents(), [
		{ name: 'flow_step', params: { flow: 'report_lost', step: 'review', dwell: '30-59', species: 'dog' } },
		{
			name: 'flow_error',
			params: { flow: 'report_lost', step: 'details', error_code: 'required', error_field: 'colours' },
		},
	]);
});

test('v2: error_code is a C1 code, NETWORK or a C12b client code; error_field a short snake_case key', () => {
	setConsent({ analytics: true });
	const base = { flow: 'sign_up', step: 'form' } as const;
	for (const code of ['VALIDATION', 'DUPLICATE_OPEN_REPORT', 'NETWORK', 'too_short', 'oauth_failed'] as const)
		track('flow_error', { ...base, error_code: code });
	assert.equal(getMockEvents().length, 5);

	// @ts-expect-error not a registered code
	assert.throws(() => track('flow_error', { ...base, error_code: 'E_TIMEOUT' }), /invalid value for "error_code"/);
	assert.throws(
		() => track('flow_error', { ...base, error_code: 'Email je že v uporabi' as never }),
		/invalid value for "error_code"/
	);
	const fields = ['address2', 'Email', 'janez@example.si', 'pet name', 'a'.repeat(33), '_email', 'email_', ''];
	for (const field of fields)
		assert.throws(
			() => track('flow_error', { ...base, error_code: 'invalid', error_field: field }),
			/invalid value for "error_field"/,
			field
		);
	track('flow_error', { ...base, error_code: 'invalid', error_field: 'a'.repeat(32) });
	track('flow_error', { ...base, error_code: 'required', error_field: 'last_seen_at' });
	assert.equal(getMockEvents().length, 7);
});

test('v2: method, purpose and plan per event; alert_opt_in has no area; lead_type and ai_prefill enums', () => {
	setConsent({ analytics: true });
	for (const method of ['email', 'google', 'apple', 'convert'] as const) track('sign_up', { method });
	for (const method of ['password', 'google', 'apple'] as const) track('login', { method });
	// @ts-expect-error share methods are not sign-up methods
	assert.throws(() => track('sign_up', { method: 'whatsapp' }), /invalid value for "method"/);
	// @ts-expect-error convert is a sign-up method only
	assert.throws(() => track('login', { method: 'convert' }), /invalid value for "method"/);
	// @ts-expect-error google is a sign-in method, not a share method
	assert.throws(() => track('share', { method: 'google', report_type: 'lost', species: 'dog' }), /"method"/);

	const pay = { value: 9.99, currency: 'EUR' } as const;
	track('purchase', { ...pay, purpose: 'boost' });
	track('begin_checkout', { ...pay, purpose: 'subscription', plan: 'yearly' });
	track('premium_subscribe', { ...pay, plan: 'monthly' });
	// @ts-expect-error a donation is tip, report_contribution or support
	assert.throws(() => track('donation', { ...pay, amount_bucket: '5-9', purpose: 'boost' }), /"purpose"/);
	// @ts-expect-error not a C13 payment purpose
	assert.throws(() => track('purchase', { ...pay, purpose: 'premium' }), /invalid value for "purpose"/);
	// @ts-expect-error monthly or yearly only
	assert.throws(() => track('premium_subscribe', { ...pay, plan: 'weekly' }), /invalid value for "plan"/);

	// @ts-expect-error the opt-in area is the person's home area (CH-327)
	assert.throws(() => track('alert_opt_in', { species: 'dog', region: 'gorenjska' }), /"region" is not allowed/);
	track('generate_lead', { lead_type: 'vet_partner' });
	// @ts-expect-error a C14 lead interest
	assert.throws(() => track('generate_lead', { lead_type: 'janez@example.si' }), /invalid value for "lead_type"/);
	track('ai_prefill', { flow: 'pet', outcome: 'edited' });
	// @ts-expect-error sign_up has no AI pre-fill
	assert.throws(() => track('ai_prefill', { flow: 'sign_up', outcome: 'filled' }), /invalid value for "flow"/);
	assert.equal(getMockEvents().length, 12);
});

test('in production a bad event is dropped and a bad parameter is stripped, nothing throws', () => {
	const env = process.env.NODE_ENV;
	process.env.NODE_ENV = 'production';
	try {
		setConsent({ analytics: true });
		track('page_scroll' as never, {} as never);
		track('reunited', { ...home, email: 'janez@example.si', municipality: 'Janez Novak' } as never);
		trackScreen('/r/AB12CD');
		assert.deepEqual(getMockEvents(), [
			{ name: 'reunited', params: { species: 'dog', region: 'osrednjeslovenska' } },
		]);
	} finally {
		process.env.NODE_ENV = env;
	}
});

test('provider comes from the environment: mock by default, misconfiguration fails loudly in tests', () => {
	setConsent({ analytics: true });
	track('poster_download', { species: 'cat', region: 'podravska' });
	assert.equal(getMockEvents().length, 1);

	assert.throws(() => initAnalytics({ storage: memory(), provider: 'firebase' }), /provider "firebase"/);

	process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = 'ga4';
	try {
		assert.throws(() => initAnalytics({ storage: memory() }), /provider "ga4"/);
	} finally {
		delete process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER;
	}
});
