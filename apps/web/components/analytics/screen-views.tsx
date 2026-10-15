'use client';

import { useEffect, useRef } from 'react';

import { trackScreen } from '@zivali/analytics';
import { usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const CATCH_ALL = '/[...rest]';

// One matcher per routing.pathnames key: `/r/[code]` → /^\/r\/[^/]+$/. New routes need no edit here.
const TEMPLATES = Object.keys(routing.pathnames).map(
	(key) => [key, new RegExp(`^${key.replace(/\[[^\]]+\]/g, '[^/]+')}$`)] as const
);

/** Internal EN pathname (no locale, params filled in) → its route template; unlisted paths are 404s and must not reach GA. */
export function routeTemplate(pathname: string): string {
	return TEMPLATES.find(([, pattern]) => pattern.test(pathname))?.[0] ?? CATCH_ALL;
}

/** A page_view per route change (C12), sent as the route template: no short codes, ids or query text. */
export function ScreenViews() {
	const pathname = usePathname();
	const sent = useRef<string>(null);

	useEffect(() => {
		if (sent.current === pathname) return; // StrictMode runs effects twice in development
		sent.current = pathname;
		trackScreen(routeTemplate(pathname));
	}, [pathname]);

	return null;
}
