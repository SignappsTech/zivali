'use client';

import { useParams, usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { trackScreen } from '@zivali/analytics';

const decode = (segment: string) => {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
};

// Literal segments of real routes; anything else unmatched is a 404 and must not reach GA.
const STATIC_SEGMENTS = new Set(['r', 'report', 'info']);
const CATCH_ALL = '/[...rest]';

/** `/en/r/AB12CD` with `{ locale: 'en', code: 'AB12CD' }` → `/r/[code]`: param values become their names, no locale. */
export function routeTemplate(pathname: string, params: Record<string, string | string[] | undefined>): string {
	const names = new Map<string, string>();
	for (const [key, value] of Object.entries(params))
		for (const part of [value ?? []].flat()) names.set(part, Array.isArray(value) ? `[...${key}]` : `[${key}]`);
	const segments = pathname
		.split('/')
		.filter(Boolean)
		.map((segment) => names.get(segment) ?? names.get(decode(segment)) ?? segment)
		.filter((segment, i, all) => segment !== '[locale]' && !(segment.startsWith('[...') && segment === all[i - 1]));
	if (segments.some((segment) => !segment.startsWith('[') && !STATIC_SEGMENTS.has(segment))) return CATCH_ALL;
	return `/${segments.join('/')}`;
}

/** A page_view per route change (C12), sent as the route template: no short codes, ids or query text. */
export function ScreenViews() {
	const pathname = usePathname();
	const params = useParams();
	const sent = useRef<string>(null);

	useEffect(() => {
		if (sent.current === pathname) return; // StrictMode runs effects twice in development
		sent.current = pathname;
		trackScreen(routeTemplate(pathname, params));
	}, [pathname, params]);

	return null;
}
