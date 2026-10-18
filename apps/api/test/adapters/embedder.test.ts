// Embedder adapters (C20 §Adapter): the deterministic mock (labels fixture, hash fallback) and the voyage request
// shape and errors against a stubbed fetch (no test reaches Voyage).
import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { EMBED_DIM, EmbedderError } from '../../adapters/embedder/index.ts';
import { mockEmbedder } from '../../adapters/embedder/mock.ts';
import { voyageEmbedder } from '../../adapters/embedder/voyage.ts';

const labels = JSON.parse(
	readFileSync(new URL('../fixtures/embeddings/labels.json', import.meta.url), 'utf8')
) as Record<string, { animal: string; view: string }>;
const hashOf = (animal: string, view: string) =>
	Object.entries(labels).find(([, l]) => l.animal === animal && l.view === view)![0];
const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i]!, 0);
const norm = (v: number[]) => Math.sqrt(dot(v, v));

describe('mock embedder', () => {
	const mock = mockEmbedder();
	const embed = async (sha256: string) => (await mock.embed([{ jpegBase64: 'AAAA', sha256 }], 'any-model'))[0]!;

	it('returns one L2-normalised 1024-d vector per image, the same for the same image', async () => {
		const out = await mock.embed(
			[
				{ jpegBase64: 'a', sha256: 'f'.repeat(64) },
				{ jpegBase64: 'b', sha256: 'e'.repeat(64) },
			],
			'voyage-multimodal-3.5'
		);
		expect(out).toHaveLength(2);
		for (const v of out) {
			expect(v).toHaveLength(EMBED_DIM);
			expect(norm(v)).toBeCloseTo(1, 6);
		}
		expect(await embed('f'.repeat(64))).toEqual(out[0]);
	});

	it('labelled views of the same animal score about 0.9 cosine, different animals about 0.1', async () => {
		const rexFront = await embed(hashOf('rex', 'front'));
		const same = [
			dot(rexFront, await embed(hashOf('rex', 'side'))),
			dot(rexFront, await embed(hashOf('rex', 'back'))),
			dot(await embed(hashOf('micka', 'front')), await embed(hashOf('micka', 'side'))),
		];
		const different = [
			dot(rexFront, await embed(hashOf('micka', 'front'))),
			dot(rexFront, await embed(hashOf('luna', 'front'))),
			dot(await embed(hashOf('micka', 'side')), await embed(hashOf('luna', 'front'))),
		];
		for (const c of same) expect(Math.abs(c - 0.9)).toBeLessThan(0.05);
		for (const c of different) expect(Math.abs(c - 0.1)).toBeLessThan(0.05);
	});

	it('an unlabelled image gets a vector derived from its hash, unrelated to other hashes', async () => {
		const a = await embed('1'.repeat(64));
		expect(Math.abs(dot(a, await embed('2'.repeat(64))))).toBeLessThan(0.15);
		expect(Math.abs(dot(a, await embed(hashOf('rex', 'front'))))).toBeLessThan(0.15);
	});
});

describe('voyage embedder', () => {
	afterEach(() => vi.unstubAllGlobals());

	const stub = (res: Response) => {
		const fetch = vi.fn(async (_url: string, _init: RequestInit) => res);
		vi.stubGlobal('fetch', fetch);
		return fetch;
	};
	const vectors = (n: number) => ({
		data: Array.from({ length: n }, (_, i) => ({ embedding: Array(EMBED_DIM).fill(i + 1) })),
	});
	const image = { jpegBase64: 'SU1BR0U=', sha256: 'c'.repeat(64) };

	it('posts the images as image_base64 data URLs with the model and output_dimension 1024, nothing else', async () => {
		const fetch = stub(Response.json(vectors(1)));
		const [v] = await voyageEmbedder('test-key').embed([image], 'voyage-multimodal-3.5');
		const [url, init] = fetch.mock.calls[0]!;
		expect(url).toBe('https://api.voyageai.com/v1/multimodalembeddings');
		expect(init.method).toBe('POST');
		expect(new Headers(init.headers).get('authorization')).toBe('Bearer test-key');
		expect(init.signal).toBeInstanceOf(AbortSignal);
		expect(JSON.parse(init.body as string)).toEqual({
			model: 'voyage-multimodal-3.5',
			inputs: [{ content: [{ type: 'image_base64', image_base64: 'data:image/jpeg;base64,SU1BR0U=' }] }],
			output_dimension: 1024,
		});
		// No photo id, hash or text leaves the API.
		expect(init.body).not.toContain(image.sha256);
		expect(norm(v!)).toBeCloseTo(1, 6);
	});

	it('times out after 10 s', async () => {
		const timeout = vi.spyOn(AbortSignal, 'timeout');
		stub(Response.json(vectors(1)));
		await voyageEmbedder('k').embed([image], 'm');
		expect(timeout).toHaveBeenCalledWith(10_000);
	});

	it('429 and 5xx throw an EmbedderError with the status code and Retry-After', async () => {
		stub(new Response('slow down', { status: 429, headers: { 'retry-after': '7' } }));
		await expect(voyageEmbedder('k').embed([image], 'm')).rejects.toMatchObject({
			code: 'http_429',
			retryAfterS: 7,
		});
		stub(new Response('', { status: 503 }));
		const err = await voyageEmbedder('k')
			.embed([image], 'm')
			.catch((e: unknown) => e);
		expect(err).toBeInstanceOf(EmbedderError);
		expect(err).toMatchObject({ code: 'http_503', retryAfterS: undefined });
	});

	it('a timeout, a network failure and a malformed or short answer throw', async () => {
		vi.stubGlobal('fetch', async () => {
			throw new DOMException('The operation timed out.', 'TimeoutError');
		});
		await expect(voyageEmbedder('k').embed([image], 'm')).rejects.toMatchObject({ code: 'timeout' });
		vi.stubGlobal('fetch', async () => {
			throw new TypeError('fetch failed');
		});
		await expect(voyageEmbedder('k').embed([image], 'm')).rejects.toMatchObject({ code: 'network' });
		stub(Response.json({ data: [{ embedding: [1, 2, 3] }] }));
		await expect(voyageEmbedder('k').embed([image], 'm')).rejects.toMatchObject({ code: 'bad_response' });
		stub(Response.json(vectors(1)));
		await expect(voyageEmbedder('k').embed([image, image], 'm')).rejects.toMatchObject({ code: 'bad_response' });
		stub(new Response('not json', { status: 200 }));
		await expect(voyageEmbedder('k').embed([image], 'm')).rejects.toMatchObject({ code: 'bad_response' });
	});
});
