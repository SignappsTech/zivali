// @vitest-environment node
import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { routing } from './routing';

const proxy = createMiddleware(routing);
const get = (path: string) => proxy(new NextRequest(`https://najdimo.si${path}`));

describe('routing (C15 pathnames)', () => {
	it.each([
		['/zemljevid', '/sl/map', '/zemljevid', '/en/map'],
		['/en/map', '/en/map', '/zemljevid', '/en/map'],
		['/r/Hk3vT9qP/ujemanja', '/sl/r/Hk3vT9qP/matches', '/r/Hk3vT9qP/ujemanja', '/en/r/Hk3vT9qP/matches'],
	])('%s renders %s with hreflang alternates', (path, internal, sl, en) => {
		const response = get(path);
		const origin = 'https://najdimo.si';
		// No rewrite header when the path already is the internal one.
		const rewrite = response.headers.get('x-middleware-rewrite');

		expect(rewrite ? new URL(rewrite).pathname : path).toBe(internal);
		expect(response.headers.get('link')).toBe(
			`<${origin}${sl}>; rel="alternate"; hreflang="sl", <${origin}${en}>; rel="alternate"; hreflang="en", <${origin}${sl}>; rel="alternate"; hreflang="x-default"`
		);
	});

	it.each([
		['/map', '/zemljevid'],
		['/sl/zemljevid', '/zemljevid'],
		['/en/zemljevid', '/en/map'],
	])('redirects %s to the localised path %s', (path, target) => {
		expect(new URL(get(path).headers.get('location')!).pathname).toBe(target);
	});
});
