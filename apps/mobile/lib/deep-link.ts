/**
 * Web link -> Expo Router path (C15). Web routes are SL unprefixed and EN under `/en`; the app has one route tree, so
 * `https://najdimo.si/en/r/Hk3vT9qP` opens `/r/Hk3vT9qP` (the app language is its own setting). The OS only hands
 * over hosts that passed link verification, so the host is not checked again.
 */
export function toAppPath(url: string): string {
	const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/en(?=\/|$|[?#])/, '');
	return path.startsWith('/') ? path : `/${path}`;
}
