/** Routes a link may open (query and hash are checked separately). */
const ALLOWED = /^\/(r\/[^/]+|m|payments\/.+)?$/;

/**
 * Web link -> Expo Router path (C15). Web routes are SL unprefixed and EN under `/en`; the app has one route tree, so
 * `https://najdimo.si/en/r/Hk3vT9qP` opens `/r/Hk3vT9qP` (the app language is its own setting). The OS only hands
 * over hosts that passed link verification, so the host is not checked again.
 * Only allowlisted routes open from outside; anything else (`/dev/kit`, `/settings/*`) lands on `/`.
 */
export function toAppPath(url: string): string {
	const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/en(?=\/|$|[?#])/, '');
	const withSlash = path.startsWith('/') ? path : `/${path}`;
	return ALLOWED.test(withSlash.replace(/[?#].*$/, '')) ? withSlash : '/';
}
