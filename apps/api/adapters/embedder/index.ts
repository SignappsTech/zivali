// Image embedding adapter (C20 §Adapter, photo.embed). Provider: EMBEDDER_PROVIDER mock | voyage | off. Unset means
// mock locally and off in staging and production (never voyage without an explicit setting, never a mock there).
import type { Config } from '../../lib/config.ts';
import { offAdapter, pickProvider } from '../select.ts';
import { mockEmbedder } from './mock.ts';
import { voyageEmbedder } from './voyage.ts';

export const EMBED_DIM = 1024;

/** One image: the JPEG to embed and its photo's sha256 (only the mock reads the hash; it is never sent). */
export type EmbedImage = { jpegBase64: string; sha256: string };
export type EmbedderAdapter = {
	provider: 'mock' | 'voyage';
	/** One L2-normalised EMBED_DIM vector per image, in order. Throws EmbedderError when the provider fails. */
	embed(images: EmbedImage[], model: string): Promise<number[][]>;
};

/** A failed provider call: `code` is logged (http_429, http_503, timeout, network, bad_response), never image data. */
export class EmbedderError extends Error {
	constructor(
		readonly code: string,
		readonly retryAfterS?: number
	) {
		super(`embedder: ${code}`);
		this.name = 'EmbedderError';
	}
}

export function normalise(v: number[]): number[] {
	const norm = Math.hypot(...v);
	return norm ? v.map((x) => x / norm) : v;
}

export function createEmbedder(cfg: Config): EmbedderAdapter {
	const provider = cfg.EMBEDDER_PROVIDER ?? (cfg.APP_ENV === 'local' ? undefined : 'off');
	const p = pickProvider('EMBEDDER_PROVIDER', provider, !!cfg.VOYAGE_API_KEY, cfg.NODE_ENV === 'production');
	if (p === 'off') return offAdapter<EmbedderAdapter>('EMBEDDER_PROVIDER');
	return p === 'mock' ? mockEmbedder() : voyageEmbedder(cfg.VOYAGE_API_KEY!);
}

/** A real provider (voyage or mock) embeds; the off adapter has no provider name (its props are throwers). */
export const embedderOn = (embedder: EmbedderAdapter): boolean =>
	embedder.provider === 'voyage' || embedder.provider === 'mock';
