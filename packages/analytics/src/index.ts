// @zivali/analytics (contract C12, ADR-009): one typed track() for web (GA4) and mobile (Firebase).
// Nothing reaches an adapter without current analytics consent; registry violations throw outside production.
import { createFirebaseAdapter, type FirebaseAnalytics } from './adapters/firebase.ts';
import { createGa4Adapter } from './adapters/ga4.ts';
import { mockAdapter } from './adapters/mock.ts';
import {
	CONSENT_VERSION,
	cookieStorage,
	isCurrent,
	parseConsent,
	type ConsentChoice,
	type ConsentState,
	type ConsentStorage,
} from './consent.ts';
import {
	checkEvent,
	isRouteTemplate,
	USER_ROLES,
	type EventName,
	type EventParams,
	type UserRole,
} from './registry.ts';

export { CONSENT_VERSION };
export { getMockEvents, resetMockEvents, type MockEvent } from './adapters/mock.ts';
export type { ConsentChoice, ConsentState, ConsentStorage, EventName, EventParams, FirebaseAnalytics, UserRole };

export type Adapter = {
	enable(): void;
	disable(): void;
	event(name: string, params: Record<string, unknown>): void;
	screen(path: string): void;
	userRole(role: UserRole): void;
};

export type AnalyticsOptions = {
	/** Overrides NEXT_PUBLIC_ANALYTICS_PROVIDER / EXPO_PUBLIC_ANALYTICS_PROVIDER (default `mock`). */
	provider?: 'mock' | 'ga4' | 'firebase';
	/** Consent record storage; default the `zz_consent` cookie (web). */
	storage?: ConsentStorage;
	/** Required for the `firebase` provider (mobile). */
	firebase?: FirebaseAnalytics;
	/** CSP nonce for gtag.js; default the nonce of the first `script[nonce]` on the page. */
	nonce?: string;
};

let options: AnalyticsOptions = {};
let adapter: Adapter | undefined;
let enabled = false;
let consent: ConsentState | null | undefined; // undefined = not read yet
let role: UserRole | undefined;
let lastPath: string | undefined;
const listeners = new Set<(state: ConsentState | null) => void>();

function fail(errors: string[]): void {
	if (errors.length && process.env.NODE_ENV !== 'production')
		throw new Error(`@zivali/analytics: ${errors.join('; ')}`);
}

function createAdapter(): Adapter {
	// Literal process.env.* reads so Next and Expo inline them at build time.
	const provider =
		options.provider ||
		process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ||
		process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER ||
		'mock';
	const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
	if (provider === 'ga4' && id) return createGa4Adapter(id, options.nonce);
	if (provider === 'firebase' && options.firebase) return createFirebaseAdapter(options.firebase);
	if (provider !== 'mock')
		fail([`provider "${provider}" needs NEXT_PUBLIC_GA_MEASUREMENT_ID (ga4) or firebase (init)`]);
	return mockAdapter;
}

/** The adapter when consent is current and granted, else null; applies grant or withdrawal on change. */
function active(): Adapter | null {
	adapter ??= createAdapter();
	const state = getConsent();
	const granted = isCurrent(state) && state.analytics;
	if (granted !== enabled) {
		enabled = granted;
		if (!granted) adapter.disable();
		else {
			adapter.enable();
			if (role) adapter.userRole(role);
			if (lastPath) adapter.screen(lastPath);
		}
	}
	return granted ? adapter : null;
}

/** Optional before first use; mobile passes `firebase` and `storage`. Resets all state (also used by tests). */
export function initAnalytics(opts: AnalyticsOptions = {}): void {
	options = opts;
	adapter = consent = role = lastPath = undefined;
	enabled = false;
}

type Args<P> = Partial<P> extends P ? [params?: P] : [params: P];

/** Sends a registered event; a no-op without consent. */
export function track<E extends EventName>(event: E, ...[params]: Args<EventParams[E]>): void {
	const result = checkEvent(event, (params ?? {}) as Record<string, unknown>);
	fail(result.errors);
	if (result.params) active()?.event(event, result.params);
}

/** GA user property `user_role`; remembered and applied once consent is granted. */
export function setUserRole(next: UserRole): void {
	if (!USER_ROLES.includes(next)) return fail(['invalid user_role']);
	const current = active();
	role = next;
	current?.userRole(next);
}

/** Web page_view / mobile screen_view. Pass the route template (`/r/[code]`), never a path with ids. */
export function trackScreen(path: string): void {
	if (!isRouteTemplate(path)) return fail(['trackScreen needs a route template such as /r/[code]']);
	const current = active();
	lastPath = path;
	current?.screen(path);
}

/** null = not asked yet. */
export function getConsent(): ConsentState | null {
	if (consent === undefined) consent = parseConsent((options.storage ?? cookieStorage).get());
	return consent;
}

/** Persists the choice and applies it to the adapter at once (grant or withdraw). */
export function setConsent(choice: ConsentChoice): void {
	const state = { v: CONSENT_VERSION, analytics: choice.analytics === true, ts: new Date().toISOString() };
	consent = state;
	(options.storage ?? cookieStorage).set(JSON.stringify(state));
	active();
	for (const listener of listeners) listener(state);
}

export function subscribeConsent(listener: (state: ConsentState | null) => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Not asked yet, consent version changed, or older than 12 months. */
export function needsConsentPrompt(): boolean {
	return !isCurrent(getConsent());
}
