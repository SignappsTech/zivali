import type { Locale } from 'next-intl';
import { useParams, usePathname as useNextPathname, useRouter as useNextRouter } from 'next/navigation';
import { useMemo } from 'react';

import type { Navigation } from './navigation';
import { internalPathname, localisedPath, type RouteHref, type RouteParams, syncLocaleCookie } from './route';

// The client hooks of next-intl's createNavigation(routing) on ./route.ts (TASK-90.7). Apart from ./navigation.ts,
// which server components import: next/navigation's hooks may not be imported where a server component reaches them.

type Router = ReturnType<typeof useNextRouter>;
type Options = { locale?: Locale } & Record<string, unknown>;

/** The current page's locale, internal pathname and params, from the URL alone (no intl provider needed). */
export function useRoute() {
	const params = useParams<RouteParams>();
	const locale = params.locale as Locale;
	return { locale, pathname: internalPathname(locale, useNextPathname()), params };
}

/** The internal pathname template of the current page (`/shelters/[slug]` on /zavetisca/…), as next-intl's. */
export const usePathname = (() => useRoute().pathname) as Navigation['usePathname'];

/** next/navigation's router with localised hrefs; `{ locale }` switches language and writes NEXT_LOCALE, as next-intl's. */
export const useRouter = (() => {
	const router = useNextRouter();
	const { locale } = useRoute();
	return useMemo(() => {
		const localise =
			(go: Router['push'] | Router['prefetch']) =>
			(href: RouteHref, { locale: next, ...options }: Options = {}) => {
				syncLocaleCookie(locale, next);
				const path = localisedPath({ locale: next ?? locale, href, forcePrefix: next ? true : undefined });
				return Object.keys(options).length ? go(path, options as never) : go(path);
			};
		return {
			...router,
			push: localise(router.push),
			replace: localise(router.replace),
			prefetch: localise(router.prefetch),
		};
	}, [router, locale]);
}) as Navigation['useRouter'];
