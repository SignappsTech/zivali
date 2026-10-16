/** Routes a link may open (query and hash are checked separately). */
const ALLOWED = /^\/(r\/[^/]+|m|payments\/.+|auth\/callback)?$/;

/**
 * Web link -> Expo Router path (C15). Web routes are SL unprefixed and EN under `/en`; the app has one route tree, so
 * `https://najdimo.si/en/r/Hk3vT9qP` opens `/r/Hk3vT9qP` (the app language is its own setting). The OS only hands
 * over hosts that passed link verification, so the host is not checked again.
 * Only allowlisted routes open from outside; anything else (`/dev/kit`, `/settings/*`) lands on `/`.
 * `/auth/callback` is the email confirmation and password reset link (zivali://auth/callback or the web URL, C3); the
 * rest of /auth stays closed (new-password also needs the in-memory recovery flag).
 */
export function toAppPath(url: string): string {
	const path = internalPath(url);
	return ALLOWED.test(path.replace(/[?#].*$/, '')) ? path : '/';
}

function internalPath(url: string): string {
	const path = url.replace(/^(https?:\/\/[^/]+|zivali:\/)/, '').replace(/^\/en(?=\/|$|[?#])/, '');
	return path.startsWith('/') ? path : `/${path}`;
}

/** Screens a notification may open (C15 §Mobile): a listing, its matches, a conversation, payments. */
const TARGETS = /^\/(r\/[\w-]+(\/matches)?|inbox\/[\w-]+|settings\/payments)$/;

/**
 * The `data.url` of a push (C10 deep link, e.g. `/r/<code>/matches`, `/inbox/<id>`) or of a local proximity alert
 * (`zivali://r/<code>`) -> app route. `/my-reports?r=<code>` opens that listing, `/account/payments` the payments
 * settings; anything else opens the inbox. Query and hash are dropped.
 */
export function toTargetPath(url: string): string {
	const [pathname = '/', query = ''] = internalPath(url).split(/[?#]/);
	if (pathname === '/my-reports') {
		const code = /(?:^|&)r=([\w-]+)/.exec(query)?.[1];
		return code ? `/r/${code}` : '/inbox';
	}
	if (pathname === '/account/payments') return '/settings/payments';
	return TARGETS.test(pathname) ? pathname : '/inbox';
}
