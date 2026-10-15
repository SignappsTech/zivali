import { routing } from './routing';

type Pathnames = Record<string, string | Record<string, string>>;

const prefix = (locale: string, path: string) =>
	locale === routing.defaultLocale ? path : `/${locale}${path === '/' ? '' : path}`;

/**
 * The hreflang `Link` header value (sl, en, x-default -> SL) for an internal path such as `/r/Hk3vT9qP/matches`.
 * Every URL is built on `origin`, the validated app URL: never from Host or X-Forwarded-* (open-redirect style poisoning).
 * Returns undefined for a path with no C15 entry.
 */
export function hreflangLink(origin: string, internalPath: string): string | undefined {
	const base = origin.replace(/\/$/, '');
	for (const [template, value] of Object.entries(routing.pathnames as Pathnames)) {
		const names = [...template.matchAll(/\[(\w+)\]/g)].map((m) => m[1]);
		const match = new RegExp(`^${template.replace(/\[\w+\]/g, '([^/]+)')}$`).exec(internalPath);
		if (!match) continue;
		const url = (locale: string) => {
			const localised = typeof value === 'string' ? value : value[locale]!;
			const path = names.reduce((p, name, i) => p.replace(`[${name}]`, match[i + 1]!), localised);
			return `${base}${prefix(locale, path)}`;
		};
		const sl = url('sl');
		return [
			`<${sl}>; rel="alternate"; hreflang="sl"`,
			`<${url('en')}>; rel="alternate"; hreflang="en"`,
			`<${sl}>; rel="alternate"; hreflang="x-default"`,
		].join(', ');
	}
}
