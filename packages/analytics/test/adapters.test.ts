import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	CONSENT_VERSION,
	initAnalytics,
	setConsent,
	setUserRole,
	track,
	trackScreen,
	type FirebaseAnalytics,
} from '../src/index.ts';

const ID = 'G-PKY4SCX3RL';
const lost = { report_type: 'lost', species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' } as const;
const expired = {
	v: CONSENT_VERSION,
	analytics: true,
	ts: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
};

// Just enough DOM for the ga4 adapter and the zz_consent cookie: a cookie jar that records every write.
function fakeBrowser(search = '?debug_mode=1&utm_source=facebook&q=Max') {
	const jar = new Map<string, string>();
	const writes: string[] = [];
	const scripts: { async?: boolean; src?: string; nonce?: string }[] = [];
	const win: Record<string, unknown> = {};
	Object.assign(globalThis, {
		window: win,
		location: {
			protocol: 'https:',
			origin: 'https://www.najdimo.si',
			hostname: 'www.najdimo.si',
			search,
		},
		document: {
			referrer: 'https://www.google.com/search?q=izgubljen+pes+Max',
			head: { appendChild: (el: object) => scripts.push(el) },
			createElement: () => ({}),
			querySelector: () => ({ nonce: 'csp-nonce' }),
			get cookie() {
				return [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
			},
			set cookie(line: string) {
				writes.push(line);
				const [pair] = line.split('; ');
				const at = pair!.indexOf('=');
				if (line.includes('Max-Age=0')) jar.delete(pair!.slice(0, at));
				else jar.set(pair!.slice(0, at), pair!.slice(at + 1));
			},
		},
	});
	const layer = () => ((win.dataLayer ?? []) as IArguments[]).map((args) => Array.from(args));
	return { jar, writes, scripts, win, layer };
}

test('ga4: nothing loads before consent; grant follows basic Consent Mode v2 order; withdraw cleans up', () => {
	const b = fakeBrowser();
	process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = 'ga4';
	process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ID;
	initAnalytics(); // default storage: the zz_consent cookie

	trackScreen('/r/[code]');
	track('report_lost_submit', lost);
	setConsent({ analytics: false });
	assert.deepEqual(b.scripts, []);
	assert.equal(b.win.dataLayer, undefined);
	assert.equal(b.win.gtag, undefined);
	assert.deepEqual([...b.jar.keys()], ['zz_consent']);
	assert.match(b.writes[0]!, /^zz_consent=%7B.*; Max-Age=34560000; Path=\/; SameSite=Lax; Secure$/);

	setConsent({ analytics: true });
	assert.deepEqual(b.scripts, [
		{ async: true, src: `https://www.googletagmanager.com/gtag/js?id=${ID}`, nonce: 'csp-nonce' },
	]);
	const [def, update, js, config, ...rest] = b.layer();
	assert.deepEqual(def, [
		'consent',
		'default',
		{ analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' },
	]);
	assert.deepEqual(update, ['consent', 'update', { analytics_storage: 'granted' }]);
	assert.equal(js![0], 'js');
	assert.deepEqual(config, ['config', ID, { send_page_view: false, debug_mode: true }]);
	// The current screen goes out as a template; the real query (q=Max) does not, campaign params do;
	// the referrer is cut to its origin (no search text).
	assert.deepEqual(rest, [
		[
			'set',
			{
				page_location: 'https://www.najdimo.si/r/[code]?utm_source=facebook',
				page_referrer: 'https://www.google.com',
				page_title: '/r/[code]',
			},
		],
		['event', 'page_view'],
	]);

	track('report_lost_submit', lost);
	setUserRole('owner');
	assert.deepEqual(b.layer().slice(-2), [
		['event', 'report_lost_submit', lost],
		['set', 'user_properties', { user_role: 'owner' }],
	]);

	b.jar.set('_ga', 'GA1.1.123');
	b.jar.set('_ga_PKY4SCX3RL', 'GS1.1.456');
	b.jar.set('other', '1');
	setConsent({ analytics: false });
	assert.deepEqual(b.layer().at(-1), ['consent', 'update', { analytics_storage: 'denied' }]);
	assert.equal(b.win[`ga-disable-${ID}`], true);
	assert.deepEqual([...b.jar.keys()].sort(), ['other', 'zz_consent']);
	assert.ok(b.writes.includes('_ga=; Max-Age=0; Path=/; Domain=najdimo.si'));

	const before = b.layer().length;
	track('report_lost_submit', lost);
	assert.equal(b.layer().length, before);

	setConsent({ analytics: true });
	assert.equal(b.scripts.length, 1);
	assert.equal(b.win[`ga-disable-${ID}`], false);
	assert.deepEqual(b.layer()[before], ['consent', 'update', { analytics_storage: 'granted' }]);
});

test('ga4: the landing utm_* attribute the first page_view after a late grant; click ids never reach GA', () => {
	const b = fakeBrowser(
		'?utm_source=google&utm_medium=cpc&utm_campaign=123&gclid=Cj0K&gbraid=0AA&wbraid=Cj1&fbclid=IwAR'
	);
	process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = 'ga4';
	process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ID;
	initAnalytics({ storage: { get: () => null, set: () => {} } });
	const pageLocations = () =>
		b
			.layer()
			.filter(([cmd, arg]) => cmd === 'set' && typeof arg === 'object')
			.map(([, arg]) => (arg as { page_location: string }).page_location);
	const nav = (search: string, path: string) => {
		(globalThis.location as { search: string }).search = search;
		trackScreen(path);
	};

	trackScreen('/'); // landing, banner shown
	nav('', '/r/[code]'); // in-app navigation, then consent
	setConsent({ analytics: true });
	nav('', '/map');
	assert.deepEqual(pageLocations(), [
		'https://www.najdimo.si/r/[code]?utm_source=google&utm_medium=cpc&utm_campaign=123',
		'https://www.najdimo.si/map',
	]);

	// A later grant whose URL carries its own campaign uses that one; click ids are dropped there too.
	setConsent({ analytics: false });
	nav('?utm_source=newsletter&gclid=Cj0K&fbclid=IwAR', '/');
	setConsent({ analytics: true });
	assert.equal(pageLocations().at(-1), 'https://www.najdimo.si/?utm_source=newsletter');
	assert.ok(!JSON.stringify(b.layer()).match(/gclid|gbraid|wbraid|fbclid|Cj0K|IwAR/));
});

function fakeFirebase() {
	const calls: unknown[][] = [];
	const rec =
		(name: string) =>
		async (...args: unknown[]) =>
			void calls.push([name, ...args]);
	const firebase: FirebaseAnalytics = {
		logEvent: rec('logEvent'),
		logScreenView: rec('logScreenView'),
		setUserProperty: rec('setUserProperty'),
		setConsent: rec('setConsent'),
		setAnalyticsCollectionEnabled: rec('setAnalyticsCollectionEnabled'),
		resetAnalyticsData: async () => {
			throw new Error('native module missing'); // swallowed: analytics never breaks the app
		},
	};
	return { calls, firebase };
}

const denied = { ad_storage: false, ad_user_data: false, ad_personalization: false };
const withdrawn = [
	['setConsent', { analytics_storage: false, ...denied }],
	['setAnalyticsCollectionEnabled', false],
];

test('firebase: injected instance, consent defaults kept denied until granted, reset on withdraw', async () => {
	const { calls, firebase } = fakeFirebase();
	let saved: string | null = null;
	initAnalytics({ provider: 'firebase', firebase, storage: { get: () => saved, set: (v) => void (saved = v) } });

	track('alert_opt_in', { species: 'cat' });
	setUserRole('shelter');
	assert.deepEqual(calls, withdrawn); // not asked yet: start applies the denied state

	setConsent({ analytics: true });
	trackScreen('/r/[code]');
	track('alert_opt_in', { species: 'cat' });
	setConsent({ analytics: false });
	track('alert_opt_in', { species: 'cat' });
	await new Promise((resolve) => setImmediate(resolve));

	assert.deepEqual(calls, [
		...withdrawn,
		['setConsent', { analytics_storage: true, ...denied }],
		['setAnalyticsCollectionEnabled', true],
		['setUserProperty', 'user_role', 'shelter'],
		['logScreenView', { screen_name: '/r/[code]', screen_class: '/r/[code]' }],
		['logEvent', 'alert_opt_in', { species: 'cat' }],
		...withdrawn,
	]);
});

test('an expired grant is withdrawn at start: ga4 cookies deleted, firebase collection off', () => {
	const b = fakeBrowser();
	process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = 'ga4';
	process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ID;
	b.jar.set('zz_consent', encodeURIComponent(JSON.stringify(expired)));
	b.jar.set('_ga', 'GA1.1.123');
	b.jar.set('_ga_PKY4SCX3RL', 'GS1.1.456');
	initAnalytics();
	assert.deepEqual([...b.jar.keys()], ['zz_consent']);
	assert.equal(b.win[`ga-disable-${ID}`], true);
	assert.deepEqual(b.scripts, []);

	const { calls, firebase } = fakeFirebase();
	const stored = JSON.stringify(expired);
	initAnalytics({ provider: 'firebase', firebase, storage: { get: () => stored, set: () => {} } });
	assert.deepEqual(calls, withdrawn);
});

test('ga4 on the server: start does not touch window, document or cookies', () => {
	const globals = globalThis as Record<string, unknown>;
	delete globals.window;
	delete globals.document;
	delete globals.location;
	process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER = 'ga4';
	process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ID;
	assert.doesNotThrow(() => initAnalytics());
	assert.doesNotThrow(() => track('report_lost_submit', lost));
});
