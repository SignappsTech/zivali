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

test('registry holds the 16 taxonomy events with GA4 parameter names only', () => {
	assert.equal(Object.keys(EVENTS).length, 16);
	const names = new Set(Object.values(EVENTS).flatMap((schema) => Object.keys(schema)));
	assert.deepEqual([...names].sort(), [
		'ad_id',
		'ad_slot',
		'amount_bucket',
		'currency',
		'match_source',
		'method',
		'municipality',
		'purpose',
		'region',
		'report_type',
		'species',
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
	track('ad_click', { ad_slot: 'feed', ad_id: '0b9e6a4c-3f1d-4c2e-9a7b-5d8e1f2a3b4c' });
	assert.equal(getMockEvents().length, 1);
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
