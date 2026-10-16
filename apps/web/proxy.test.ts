import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { env } from '@/lib/env';

import { config, proxy } from './proxy';

describe('report page status (TASK-18.2)', () => {
	const fetchMock = vi.fn<typeof fetch>();
	// The API's answer per code: GONE (hidden, removed, closed > 30 days), NOT_FOUND, an open report.
	const statuses: Record<string, number> = { Gone1234: 410, Nope1234: 404, Open1234: 200, Bad: 400 };
	const run = (path: string, headers: Record<string, string> = {}) => {
		fetchMock.mockImplementation(async (input) => {
			const code = String(input).split('/').pop()!;
			return new Response('{}', { status: statuses[code] ?? 500 });
		});
		vi.stubGlobal('fetch', fetchMock);
		return proxy(new NextRequest(`https://najdimo.si${path}`, { headers }));
	};
	afterEach(() => {
		vi.unstubAllGlobals();
		fetchMock.mockReset();
	});

	it.each([
		['/r/Gone1234', 410],
		['/en/r/Gone1234', 410],
		['/r/Nope1234', 404],
		['/r/Bad', 404],
		['/r/Open1234', 200],
		['/en/r/Open1234', 200],
	])('%s answers %i and still renders the page', async (path, status) => {
		const response = await run(path);

		expect(response.status).toBe(status);
		expect(fetchMock).toHaveBeenCalledWith(
			`http://localhost:4000/v1/reports/${path.split('/').pop()}`,
			expect.objectContaining({ headers: {} })
		);
		// Still routed: the SL rewrite to /sl/... (EN passes through), and the page's CSP.
		if (!path.startsWith('/en')) expect(response.headers.get('x-middleware-rewrite')).toMatch(/\/sl\/r\//);
		else expect(response.headers.get('x-middleware-next')).toBe('1');
		expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
	});

	it('client navigations and prefetches (RSC) skip the check', async () => {
		const response = await run('/r/Gone1234', { rsc: '1' });

		expect(response.status).toBe(200);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('keeps 200 when the API cannot be asked', async () => {
		fetchMock.mockRejectedValue(new TypeError('fetch failed'));
		vi.stubGlobal('fetch', fetchMock);

		expect((await proxy(new NextRequest('https://najdimo.si/r/Gone1234'))).status).toBe(200);
	});

	it('other pages are not checked', async () => {
		await run('/r/Gone1234/ujemanja');
		await run('/zemljevid');

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('leaves the Open Graph image route out of the matcher', () => {
		const matcher = new RegExp(`^${config.matcher}$`);

		expect(matcher.test('/r/Open1234/opengraph-image')).toBe(false);
		expect(matcher.test('/r/Open1234')).toBe(true);
		expect(matcher.test('/en/r/Open1234')).toBe(true);
	});
});

describe('content security policy', () => {
	it('lets signed photo URLs load: the storage origin is in img-src as well as connect-src', async () => {
		const response = await proxy(new NextRequest('https://najdimo.si/en/map'));
		const directives = Object.fromEntries(
			response.headers
				.get('content-security-policy')!
				.split('; ')
				.map((part) => [part.split(' ')[0], part])
		);
		const origin = new URL(env.R2_UPLOAD_ORIGIN).origin;

		expect(directives['img-src']).toContain(origin);
		expect(directives['connect-src']).toContain(origin);
	});
});
