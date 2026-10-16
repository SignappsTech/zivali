// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { publicReport } from '@zivali/api/__fixtures__/reports';
import type { PublicReport } from '@zivali/types';

import { GET } from './route';

const fetchMock = vi.fn<typeof fetch>();
const get = (code: string, query = '') =>
	GET(new Request(`https://najdimo.si/r/${code}/poster.pdf${query}`), { params: Promise.resolve({ code }) });
const API = 'http://localhost:4000';
const WEBP = 'http://127.0.0.1:9000/zivali-media/r/1/2/display.webp';
const JPEG = 'http://127.0.0.1:9000/zivali-media/r/1/2/display.jpg';
// 1 × 1 PNG; pdfkit takes JPEG and PNG.
const PHOTO = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);
const report: PublicReport = { ...publicReport, photos: [{ ...publicReport.photos[0]!, url: WEBP }] };

/** The API (report, reverse lookup) and the media origin, each answer by URL. */
function serve(
	body: unknown,
	status = 200,
	photo: Response | Error = new Response(PHOTO, { headers: { 'content-type': 'image/png' } })
) {
	fetchMock.mockImplementation(async (input) => {
		const url = String(input);
		if (url.startsWith(`${API}/v1/reports/`)) return new Response(JSON.stringify(body), { status });
		if (url === `${API}/v1/geo/reverse`)
			return new Response(JSON.stringify({ place: { label: 'Šiška, Ljubljana' } }), { status: 200 });
		if (url === JPEG) {
			if (photo instanceof Error) throw photo;
			return photo.clone();
		}
		return new Response(null, { status: 404 });
	});
}
const calls = () => fetchMock.mock.calls.map(([url]) => String(url));

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
});

describe('/r/[code]/poster.pdf', () => {
	it('answers an A4 PDF named by the code only, from the public read model and the JPEG variant', async () => {
		serve(report);
		const response = await get('Hk3vT9qP', '?lang=en');
		const pdf = Buffer.from(await response.arrayBuffer());

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('application/pdf');
		expect(response.headers.get('content-disposition')).toBe(`inline; filename="najdimo-${report.short_code}.pdf"`);
		expect(response.headers.get('x-robots-tag')).toBe('noindex');
		expect(response.headers.get('cache-control')).toBe('private, max-age=300');
		expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
		expect(pdf.toString('latin1')).toContain('/Lang (en)');
		// No session: the poster is what everyone who scans it sees.
		const [url, init] = fetchMock.mock.calls[0]!;
		expect(url).toBe(`${API}/v1/reports/Hk3vT9qP`);
		expect(init?.headers).toEqual({ 'Accept-Language': 'en' });
		expect(calls()).toContain(JPEG);
		expect(calls()).not.toContain(WEBP);
	});

	it('is Slovenian unless ?lang=en', async () => {
		serve(report);
		const pdf = Buffer.from(await (await get('Hk3vT9qP', '?lang=de')).arrayBuffer());
		expect(pdf.toString('latin1')).toContain('/Lang (sl)');
	});

	it('draws the "Spet doma" poster for a reunited report', async () => {
		serve({ ...report, status: 'reunited' });
		expect((await get('Hk3vT9qP')).status).toBe(200);
	});

	it.each([
		['unknown, held or malformed', { error: { code: 'NOT_FOUND', message: 'x' } }, 404, 404],
		['gone', { error: { code: 'GONE', message: 'x' } }, 410, 404],
		['an API failure', { error: { code: 'INTERNAL', message: 'x' } }, 500, 503],
	])('answers %s without a poster', async (_, body, status, expected) => {
		serve(body, status);
		const response = await get('Hk3vT9qP');
		expect(response.status).toBe(expected);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('is unavailable for a closed search (410) and blocked without a photo (409)', async () => {
		serve({ ...report, status: 'closed' });
		expect((await get('Hk3vT9qP')).status).toBe(410);
		serve({ ...report, photos: [] });
		expect((await get('Hk3vT9qP')).status).toBe(409);
	});

	it('answers a malformed code 404 without asking the API', async () => {
		serve(report);
		const response = await get('../x');
		expect(response.status).toBe(404);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('answers 503, uncached, for a photo that redirects, is over 4 MB or lies about its size', async () => {
		for (const photo of [
			new Error('redirect'),
			new Response(PHOTO, {
				headers: { 'content-type': 'image/png', 'content-length': String(5 * 1024 * 1024) },
			}),
			new Response(new Uint8Array(4 * 1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } }),
		]) {
			serve(report, 200, photo);
			const response = await get('Hk3vT9qP');
			expect([response.status, response.headers.get('cache-control')]).toEqual([503, 'no-store']);
		}
		serve(report);
		await get('Hk3vT9qP');
		expect(fetchMock.mock.calls.find(([url]) => String(url) === JPEG)?.[1]?.redirect).toBe('error');
	});

	it('answers 503 (retry) when the photo cannot be fetched, and never fetches from another origin', async () => {
		serve(report, 200, new Error('offline'));
		expect((await get('Hk3vT9qP')).status).toBe(503);

		fetchMock.mockReset();
		serve({ ...report, photos: [{ ...report.photos[0]!, url: 'https://evil.example/display.jpg' }] });
		expect((await get('Hk3vT9qP')).status).toBe(503);
		expect(calls().some((url) => url.startsWith('https://evil.example'))).toBe(false);
	});
});
