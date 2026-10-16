import type { Locale } from 'next-intl';

import { routing } from './routing';

// next-intl's navigation (createNavigation) imports its client Link wrapper, which reads the locale from the intl
// provider, so every page that imported it shipped use-intl. These are its mappings for this routing (prefix
// as-needed, no domains, no base path, no trailing slash), pure, for server and client: ./navigation.ts builds the
// app's Link, getPathname and redirect on them, ./client-navigation.ts the hooks (TASK-90.7).

type Pathnames = Record<string, string | Record<Locale, string>>;
type QueryValue = string | number | boolean;
export type RouteParams = Record<string, string | string[] | undefined>;
export type RouteHref =
	string | { pathname: string; params?: RouteParams; query?: Record<string, QueryValue | QueryValue[] | undefined> };

const pathnames = routing.pathnames as Pathnames;
const localised = (internal: string, locale: Locale) => {
	const value = pathnames[internal]!;
	return typeof value === 'string' ? value : value[locale];
};
const pattern = (template: string) => new RegExp(`^${template.replace(/\[\w+\]/g, '[^/]+')}$`);

/**
 * The internal pathname of a browser path (`/en/shelters/zavetisce-ljubljana` → `/shelters/[slug]`), as next-intl's
 * usePathname returns it: the route template, in routing order, or the unprefixed path when no entry matches.
 */
export function internalPathname(locale: Locale, path: string): string {
	const prefix = `/${locale}`;
	const unprefixed = path === prefix ? '/' : path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path;
	const decoded = decodeURI(unprefixed);
	return Object.keys(pathnames).find((key) => pattern(localised(key, locale)).test(decoded)) ?? unprefixed;
}

/**
 * next-intl's getPathname: the localised path of an internal pathname (params filled in, query appended), SL
 * unprefixed unless `forcePrefix` (a locale change, so the proxy can move the NEXT_LOCALE cookie).
 */
export function localisedPath({
	locale,
	href,
	forcePrefix,
}: {
	locale: Locale;
	href: RouteHref;
	forcePrefix?: boolean;
}) {
	const { pathname, params = {}, query } = typeof href === 'string' ? { pathname: href } : href;
	let path = pathname;
	if (pathnames[pathname]) {
		const template = localised(pathname, locale);
		path = template.replace(/\[(\w+)\]/g, (slot, name: string) => {
			const value = params[name];
			if (value === undefined) throw new Error(`Insufficient params for ${template}: ${JSON.stringify(params)}`);
			return Array.isArray(value) ? value.join('/') : String(value);
		});
		path = new URL(path, 'http://l').pathname;
	}
	if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);
	if (query) {
		const search = new URLSearchParams();
		for (const [key, value] of Object.entries(query))
			for (const item of Array.isArray(value) ? value : [value]) search.append(key, String(item));
		path += `?${search}`;
	}
	const prefixed = forcePrefix ?? (path.startsWith('/') && locale !== routing.defaultLocale);
	return prefixed ? `/${locale}${/^\/(\?.*)?$/.test(path) ? path.slice(1) : path}` : path;
}

/** next-intl's locale cookie on a language change (its routing default: NEXT_LOCALE, SameSite lax, session). */
export function syncLocaleCookie(current: Locale, next: Locale | undefined) {
	if (next && next !== current) document.cookie = `NEXT_LOCALE=${next};sameSite=lax;path=/;`;
}
