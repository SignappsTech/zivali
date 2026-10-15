import assert from 'node:assert/strict';
import { test } from 'node:test';

import { initAnalytics, setConsent, setUserRole, track, trackScreen, type FirebaseAnalytics } from '../src/index.ts';

const ID = 'G-PKY4SCX3RL';
const lost = { report_type: 'lost', species: 'dog', region: 'osrednjeslovenska', municipality: 'ljubljana' } as const;

// Just enough DOM for the ga4 adapter and the zz_consent cookie: a cookie jar that records every write.
function fakeBrowser() {
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
			search: '?debug_mode=1&utm_source=facebook&q=Max',
		},
		document: {
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
	assert.match(b.writes[0]!, /^zz_consent=%7B.*; Max-Age=31536000; Path=\/; SameSite=Lax; Secure$/);

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
	// The current screen goes out as a template; the real query (q=Max) does not, campaign params do.
	assert.deepEqual(rest, [
		['set', { page_location: 'https://www.najdimo.si/r/[code]?utm_source=facebook', page_title: '/r/[code]' }],
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

test('firebase: injected instance, consent defaults kept denied until granted, reset on withdraw', async () => {
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
	let saved: string | null = null;
	initAnalytics({ provider: 'firebase', firebase, storage: { get: () => saved, set: (v) => void (saved = v) } });

	track('alert_opt_in', { species: 'cat' });
	setUserRole('shelter');
	assert.deepEqual(calls, []);

	setConsent({ analytics: true });
	trackScreen('/r/[code]');
	track('alert_opt_in', { species: 'cat' });
	setConsent({ analytics: false });
	track('alert_opt_in', { species: 'cat' });
	await new Promise((resolve) => setImmediate(resolve));

	const denied = { ad_storage: false, ad_user_data: false, ad_personalization: false };
	assert.deepEqual(calls, [
		['setConsent', { analytics_storage: true, ...denied }],
		['setAnalyticsCollectionEnabled', true],
		['setUserProperty', 'user_role', 'shelter'],
		['logScreenView', { screen_name: '/r/[code]', screen_class: '/r/[code]' }],
		['logEvent', 'alert_opt_in', { species: 'cat' }],
		['setConsent', { analytics_storage: false, ...denied }],
		['setAnalyticsCollectionEnabled', false],
	]);
});
