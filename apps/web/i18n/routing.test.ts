// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { proxy } from '../proxy';

const get = (path: string, host = 'najdimo.si') =>
	proxy(new NextRequest(`https://${host}${path}`, { headers: { host, 'x-forwarded-host': host } }));

describe('routing (C15 pathnames)', () => {
	it.each([
		['/zemljevid', '/sl/map', '/zemljevid', '/en/map'],
		['/en/map', '/en/map', '/zemljevid', '/en/map'],
		['/r/Hk3vT9qP/ujemanja', '/sl/r/Hk3vT9qP/matches', '/r/Hk3vT9qP/ujemanja', '/en/r/Hk3vT9qP/matches'],
	])('%s renders %s with hreflang alternates', async (path, internal, sl, en) => {
		const response = await get(path);
		const origin = 'https://najdimo.si';
		// No rewrite header when the path already is the internal one.
		const rewrite = response.headers.get('x-middleware-rewrite');

		expect(rewrite ? new URL(rewrite).pathname : path).toBe(internal);
		expect(response.headers.get('link')).toBe(
			`<${origin}${sl}>; rel="alternate"; hreflang="sl", <${origin}${en}>; rel="alternate"; hreflang="en", <${origin}${sl}>; rel="alternate"; hreflang="x-default"`
		);
	});

	it('builds absolute links on the app URL, never on the request Host', async () => {
		const link = (await get('/en/map', '127.0.0.1:3000')).headers.get('link')!;
		const urls = [...link.matchAll(/<([^>]+)>/g)].map((m) => m[1]);

		expect(urls).toEqual([
			'https://najdimo.si/zemljevid',
			'https://najdimo.si/en/map',
			'https://najdimo.si/zemljevid',
		]);
		expect(link).not.toContain('127.0.0.1');
	});

	it.each([
		['/map', '/zemljevid'],
		['/sl/zemljevid', '/zemljevid'],
		['/en/zemljevid', '/en/map'],
	])('redirects %s to the localised path %s', async (path, target) => {
		expect(new URL((await get(path)).headers.get('location')!).pathname).toBe(target);
	});
});
