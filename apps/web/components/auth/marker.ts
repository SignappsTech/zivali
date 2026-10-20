import { flowTracker, track } from '@zivali/analytics';

// The auth callback (app/[locale]/auth/callback) marks its redirect with `?auth=<marker>` after a confirmation link or
// a provider return; the page it lands on (AuthMain, or SessionSync on signed-in pages) sends the C12b event and drops
// the marker from the address. trackScreen sends only the route template, so the marker never reaches GA.
export const AUTH_MARKER = 'auth';

const MARKERS = {
	verified: () => flowTracker('sign_up').step('verified'),
	signup_google: () => track('sign_up', { method: 'google' }),
	signup_apple: () => track('sign_up', { method: 'apple' }),
	login_google: () => track('login', { method: 'google' }),
	login_apple: () => track('login', { method: 'apple' }),
};
export type AuthMarker = keyof typeof MARKERS;

/**
 * Sends what the callback's marker says, once: the address loses it at once, with or without consent. `send` false
 * (the staff console, SessionSync) only drops it.
 */
export function sendAuthMarker(send = true): void {
	const url = new URL(window.location.href);
	const marker = url.searchParams.get(AUTH_MARKER);
	if (marker === null) return;
	url.searchParams.delete(AUTH_MARKER);
	window.history.replaceState(null, '', url);
	if (send && Object.hasOwn(MARKERS, marker)) MARKERS[marker as AuthMarker]();
}
