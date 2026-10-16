// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';

import { GET } from './route';

const realFetch = globalThis.fetch;
const fetchMock = vi.fn<typeof fetch>();
const get = (code: string, query = '') =>
	GET(new Request(`https://najdimo.si/r/${code}/opengraph-image${query}`), { params: Promise.resolve({ code }) });
const API = 'http://localhost:4000/';
// The API answers here; next/og loads its own wasm through fetch, so anything else passes through.
const answer = (status: number, body: unknown) =>
	fetchMock.mockImplementation(async (input, init) =>
		String(input).startsWith(API) ? new Response(JSON.stringify(body), { status }) : realFetch(input, init)
	);
const httpCalls = () => fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => /^https?:/.test(url));

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
});

describe('/r/[code]/opengraph-image', () => {
	it('draws a 1200 x 630 PNG for a public report, cached for an hour', async () => {
		answer(200, publicReport);
		const response = await get('Hk3vT9qP', '?lang=en');
		const png = Buffer.from(await response.arrayBuffer());

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/png');
		expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
		expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
		// The public read model, without a session, in the asked language.
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe('http://localhost:4000/v1/reports/Hk3vT9qP');
		expect(init?.headers).toEqual({ 'Accept-Language': 'en' });
	});

	it('draws the first photo, fetched from the media origin (MinIO locally)', async () => {
		const photo = 'http://127.0.0.1:9000/zivali-media/r/1/2/display.jpg';
		const png = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
			'base64'
		);
		answer(200, { ...publicReport, photos: [{ ...publicReport.photos[0]!, url: photo }] });
		const api = fetchMock.getMockImplementation()!;
		fetchMock.mockImplementation(async (input, init) =>
			String(input) === photo ? new Response(png, { headers: { 'content-type': 'image/png' } }) : api(input, init)
		);

		expect((await get('Hk3vT9qP')).status).toBe(200);
		expect(httpCalls()).toEqual(['http://localhost:4000/v1/reports/Hk3vT9qP', photo]);
	});

	it('fetches no photo from an origin the API does not serve photos from', async () => {
		answer(200, { ...publicReport, photos: [{ ...publicReport.photos[0]!, url: 'https://evil.example/x.jpg' }] });
		await get('Hk3vT9qP');

		expect(httpCalls()).toEqual(['http://localhost:4000/v1/reports/Hk3vT9qP']);
	});

	it.each([
		[410, 'GONE'],
		[404, 'NOT_FOUND'],
	])('answers 404 when the API says %i (%s)', async (status, code) => {
		answer(status, { error: { code, message: code } });
		expect((await get('Gone1234')).status).toBe(404);
	});
});
