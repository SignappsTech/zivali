// Voyage multimodal embeddings over plain fetch (C20 §Adapter, ADR-013): images only, no ids or text in the request.
import { EMBED_DIM, EmbedderError, normalise, type EmbedderAdapter } from './index.ts';

const VOYAGE_URL = 'https://api.voyageai.com/v1/multimodalembeddings';
const TIMEOUT_MS = 10_000;

/** Retry-After as seconds (delta or HTTP date); undefined when absent or unreadable. */
function retryAfterS(header: string | null): number | undefined {
	if (!header) return undefined;
	const s = Number.isFinite(Number(header)) ? Number(header) : (Date.parse(header) - Date.now()) / 1000;
	return Number.isFinite(s) ? Math.max(0, s) : undefined;
}

export function voyageEmbedder(apiKey: string): EmbedderAdapter {
	return {
		provider: 'voyage',
		async embed(images, model) {
			const res = await fetch(VOYAGE_URL, {
				method: 'POST',
				headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
				body: JSON.stringify({
					model,
					inputs: images.map((image) => ({
						content: [{ type: 'image_base64', image_base64: `data:image/jpeg;base64,${image.jpegBase64}` }],
					})),
					output_dimension: EMBED_DIM,
				}),
				signal: AbortSignal.timeout(TIMEOUT_MS),
			}).catch((err: unknown) => {
				throw new EmbedderError(err instanceof Error && err.name === 'TimeoutError' ? 'timeout' : 'network');
			});
			// 429 and 5xx (and any other refusal) throw, so pg-boss retries; the body is never read or logged.
			if (!res.ok) throw new EmbedderError(`http_${res.status}`, retryAfterS(res.headers.get('retry-after')));
			const body = (await res.json().catch(() => null)) as { data?: { embedding?: unknown }[] } | null;
			const out = body?.data?.map((d) => d.embedding);
			const valid = (v: unknown): v is number[] =>
				Array.isArray(v) && v.length === EMBED_DIM && v.every((x) => typeof x === 'number');
			if (out?.length !== images.length || !out.every(valid)) throw new EmbedderError('bad_response');
			return out.map(normalise);
		},
	};
}
