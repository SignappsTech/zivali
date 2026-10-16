import { useLocale } from 'next-intl';
import type { createNavigation } from 'next-intl/navigation';
import NextLink from 'next/link';
import { redirect as nextRedirect } from 'next/navigation';
import { type ComponentProps, createElement } from 'react';

import { localisedPath } from './route';
import type { routing } from './routing';

// The API of next-intl's createNavigation(routing), typed by it, on the mappings in ./route.ts: next-intl's runtime
// imports its client Link wrapper, which reads the intl provider, so every page shipped use-intl (TASK-90.7). Server
// and client components import this module; the hooks (usePathname, useRouter) are in ./client-navigation.ts.
export type Navigation = ReturnType<
	typeof createNavigation<typeof routing.locales, 'as-needed', typeof routing.pathnames, never>
>;

/** `getPathname({ locale, href: '/map' })` is /zemljevid in SL, /en/map in EN; params fill the template, query follows. */
export const getPathname = localisedPath as Navigation['getPathname'];

/** next/navigation's redirect to the localised path of `{ href, locale }`. */
export const redirect = ((args, type) => nextRedirect(localisedPath(args as never), type)) as Navigation['redirect'];

/**
 * Locale-aware Link: `<Link href="/map">` renders /zemljevid in SL and /en/map in EN. next-intl's Link hands the href
 * to a client wrapper that reads the intl provider; this one localises it where it renders (server or client) and
 * passes it to next/link. Language changes go through LanguageSwitch, so there is no `locale` prop.
 */
export function Link({ href, ...props }: Omit<ComponentProps<Navigation['Link']>, 'locale'>) {
	const locale = useLocale();
	// As next-intl's Link: only absolute paths are localised; next/link serialises the query.
	if (typeof href === 'string')
		return createElement(NextLink, {
			...props,
			href: href.startsWith('/') ? localisedPath({ locale, href }) : href,
		});
	const { pathname, params } = href as { pathname: string; params?: Record<string, string> };
	const localised = pathname.startsWith('/') ? localisedPath({ locale, href: { pathname, params } }) : pathname;
	return createElement(NextLink, { ...props, href: { ...href, pathname: localised } });
}
